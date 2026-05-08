#!/usr/bin/env python3
"""
CLIP Search API Service

Provides visual similarity search using FashionSigLIP embeddings.
Supports text queries and returns similar products from the catalog.
"""

from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json
import numpy as np
import torch
import open_clip
from pathlib import Path
import sys
import time
from PIL import Image
import requests
from io import BytesIO

app = Flask(__name__)
CORS(app)

# Static file paths
SCRIPTS_DIR = Path(__file__).parent.parent.parent / "scripts"
PRODUCT_IMAGES_DIR = SCRIPTS_DIR / "product-images"

# Global state
model = None
tokenizer = None
preprocess = None
products = []
embeddings = None
product_ids = []
style_concept_embeddings = None  # Cached embeddings for style concepts

def select_best_outfit_image(images):
    """
    Select best image for outfit display.
    Priority: primary-flat-lay > any flat-lay > non-lifestyle > first image
    """
    if not images or len(images) == 0:
        return None

    def get_url(img):
        if img.get('url'):
            return img['url']
        # Convert localImagePath to public URL
        if img.get('localImagePath'):
            filename = img['localImagePath'].split('/')[-1]
            return f'/product-images/{filename}'
        return None

    # Priority 1: Primary flat-lay
    for img in images:
        img_type = img.get('type', '')
        if img_type == 'primary-flat-lay' or ('flat-lay' in img_type.lower() and img.get('isPrimary')):
            url = get_url(img)
            if url:
                return url

    # Priority 2: Any flat-lay
    for img in images:
        if 'flat-lay' in img.get('type', '').lower():
            url = get_url(img)
            if url:
                return url

    # Priority 3: Non-lifestyle (avoid on-model-lifestyle)
    for img in images:
        if 'lifestyle' not in img.get('type', '').lower():
            url = get_url(img)
            if url:
                return url

    # Priority 4: First image
    return get_url(images[0])

# Global state for image gaps
image_gaps = []

def load_embeddings_and_products():
    """Load product embeddings and metadata."""
    import os
    import urllib.request

    global products, embeddings, product_ids, image_gaps

    print("Loading products and embeddings...")

    # Try to download from URL if PRODUCTS_URL is set
    products_url = os.environ.get('PRODUCTS_URL')
    products_path = Path(__file__).parent / "products.json"

    if products_url and not products_path.exists():
        print(f"  Downloading from: {products_url}")
        try:
            urllib.request.urlretrieve(products_url, products_path)
            print(f"  ✅ Downloaded to {products_path}")
        except Exception as e:
            print(f"  ❌ Download failed: {e}")

    # Try local files if download failed or no URL
    if not products_path.exists():
        products_path = Path(__file__).parent / "products-minimal.json"
    if not products_path.exists():
        products_path = Path(__file__).parent / "products-enhanced.json"
    if not products_path.exists():
        products_path = Path(__file__).parent / "products-lightweight.json"
    if not products_path.exists():
        products_path = Path(__file__).parent.parent.parent / "scripts" / "products-MASTER-SOURCE-OF-TRUTH.json"
    if not products_path.exists():
        products_path = Path(__file__).parent.parent.parent / "scripts" / "products-UNIFIED-ALL-WITH-EMBEDDINGS.json"

    if products_path.exists():
        print(f"  Loading from: {products_path.name}")
        with open(products_path) as f:
            products = json.load(f)
        print(f"  Loaded {len(products):,} products")

        # Minimal/enhanced/lightweight files already have imageUrl and embeddings ready
        # Just extract embeddings into numpy array
        embeddings_list = []
        product_ids_list = []

        for i, product in enumerate(products):
            emb = product.get('embeddingFlat') or product.get('embeddingOnModel')
            imageUrl = product.get('imageUrl', '')

            if emb and imageUrl:
                # Parse embedding if it's a string (JSON-encoded)
                if isinstance(emb, str):
                    emb = json.loads(emb)
                embeddings_list.append(emb)
                product_ids_list.append(i)

        embeddings = np.array(embeddings_list, dtype=np.float32)
        product_ids = product_ids_list
        print(f"  Loaded {len(embeddings):,} embeddings")
    else:
        print(f"  WARNING: No product file found")
        products = []
        embeddings = np.array([])
        product_ids = []

def load_model():
    """Load FashionSigLIP model for text and image encoding."""
    global model, tokenizer, preprocess

    print("Loading FashionSigLIP model...")
    model, _, preprocess_transform = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
    preprocess = preprocess_transform
    tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')
    model.eval()
    print("  Model loaded (text + image encoding enabled)")

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'products_loaded': len(products),
        'embeddings_loaded': len(embeddings) if embeddings is not None else 0,
        'image_gaps': len(image_gaps)
    })

@app.route('/image-gaps', methods=['GET'])
def get_image_gaps():
    """
    Get list of products that have embeddings but no valid images.
    These products exist in the catalog but can't be displayed in outfits.

    Response:
    {
        "imageGaps": [
            {
                "productId": "...",
                "productTitle": "...",
                "brand": "...",
                "department": "...",
                "productType1": "...",
                "productType2": "...",
                "price": 24.99
            }
        ],
        "total": 37
    }
    """
    return jsonify({
        'imageGaps': image_gaps,
        'total': len(image_gaps)
    })

@app.route('/product-images/<path:filename>')
def serve_product_image(filename):
    """Serve product images from product images directory."""
    return send_from_directory(PRODUCT_IMAGES_DIR, filename)

@app.route('/search', methods=['GET', 'POST'])
def search():
    """
    Search for products by text query using FashionSigLIP embeddings.

    ARCHITECTURE: Returns minimal preview data only. Frontend queries Supabase for full product details.

    IMPORTANT: Product embeddings must be generated from detail_desc (descriptive text),
    not SKU names or short titles. FashionSigLIP requires 1-2 sentence descriptions
    of garment type, fit, material, and key details.

    Validated similarity threshold: 0.08 (95% recall, 45.6% precision)
    - Matching pairs (image + own detail_desc): mean=0.128, median=0.126
    - Non-matching pairs: mean=-0.041, median=-0.047

    GET Request: /search?q=query&type=Tops&limit=20&offset=0
    POST Request: {"query": "...", "limit": 20, "offset": 0, "filters": {...}}

    Filters supported:
    - productType1, productType2 (exact match)
    - department (exact match)
    - gender (exact match)
    - colors (array, matches any color in simplifiedColors)

    Response (minimal - productId + preview fields only):
    {
        "results": [
            {
                "productId": "...",
                "title": "...",
                "brand": "...",
                "price": 39.99,
                "imageUrl": "...",
                "productType1": "...",
                "productType2": "...",
                "department": "...",
                "simplifiedColors": [...],
                "score": 0.85
            }
        ],
        "total": 1523,
        "limit": 20,
        "offset": 0
    }

    Frontend should query Supabase with productIds for full product details.
    """
    start_time = time.time()

    # Handle GET or POST
    if request.method == 'GET':
        query = request.args.get('q', '')
        limit = int(request.args.get('limit', 20))
        offset = int(request.args.get('offset', 0))
        filters = {}
        if request.args.get('type'):
            filters['productType1'] = request.args.get('type')
        if request.args.get('type2'):
            filters['productType2'] = request.args.get('type2')
        if request.args.get('department'):
            filters['department'] = request.args.get('department')
        # Color filtering (NEW)
        if request.args.get('colors'):
            # Parse JSON array from query string
            import json as json_module
            try:
                filters['colors'] = json_module.loads(request.args.get('colors'))
            except:
                filters['colors'] = [request.args.get('colors')]  # Single color as array
    else:
        data = request.json
        query = data.get('query', '')
        limit = data.get('limit', 20)
        offset = data.get('offset', 0)
        filters = data.get('filters', {})

    if not query:
        return jsonify({'error': 'Query required'}), 400

    if embeddings is None or len(embeddings) == 0:
        return jsonify({'error': 'No embeddings loaded'}), 500

    # Generate query embedding
    text_tokens = tokenizer([query])
    with torch.no_grad():
        query_embedding = model.encode_text(text_tokens, normalize=True)
        query_embedding = query_embedding.cpu().numpy()[0]

    # Compute similarities
    similarities = np.dot(embeddings, query_embedding)

    # Get top results
    top_indices = np.argsort(similarities)[::-1]

    # Apply filters and collect results (with pagination)
    all_results = []
    for idx in top_indices:
        product_idx = product_ids[idx]
        product = products[product_idx]
        score = float(similarities[idx])

        # Apply filters
        if filters:
            if 'productType1' in filters and product.get('productType1') != filters['productType1']:
                continue
            if 'productType2' in filters and product.get('productType2') != filters['productType2']:
                continue
            if 'gender' in filters and product.get('gender') not in filters['gender']:
                continue
            if 'department' in filters and product.get('department') not in filters['department']:
                continue

            # Color filtering (NEW - strict color matching)
            if 'colors' in filters and filters['colors']:
                product_colors = product.get('simplifiedColors', [])
                # Product must have at least one of the required colors
                has_matching_color = any(
                    color in product_colors
                    for color in filters['colors']
                )
                if not has_matching_color:
                    continue

        # Extract vision metadata (safely handle missing/malformed data)
        vision_meta = product.get('visionMetadata', {})
        visual_attrs = vision_meta.get('visualAttributes', []) if isinstance(vision_meta, dict) else []
        vision_reasoning = vision_meta.get('reasoning', '') if isinstance(vision_meta, dict) else ''

        # Extract AI enrichment data (comprehensive descriptions and attributes)
        ai_enriched = product.get('aiEnriched', {})
        ai_descriptions = ai_enriched.get('descriptions', {}) if isinstance(ai_enriched, dict) else {}
        ai_lifestyle = ai_enriched.get('lifestyle', {}) if isinstance(ai_enriched, dict) else {}

        # Collect all matching results (for pagination)
        # MINIMAL RESPONSE: Recipe Builder queries Supabase for full product details
        # This only includes what's needed for preview cards + the filters used
        all_results.append({
            # Core identifier
            'productId': product.get('productId'),

            # Preview card fields
            'title': product.get('title'),
            'brand': product.get('brand'),
            'price': product.get('price'),
            'imageUrl': product.get('imageUrl'),

            # Filter fields (what was used to filter)
            'productType1': product.get('productType1'),
            'productType2': product.get('productType2'),
            'department': product.get('department'),
            'simplifiedColors': product.get('simplifiedColors', []),

            # Similarity score
            'score': score,
        })

    # Apply pagination
    total = len(all_results)
    paginated_results = all_results[offset:offset + limit]

    return jsonify({
        'results': paginated_results,
        'total': total,
        'limit': limit,
        'offset': offset
    })

@app.route('/product/<product_id>')
def get_product(product_id):
    """
    Get full product details by ID (for PDP).

    Returns complete product data without embeddings.

    Response:
    {
        "product": {
            "productId": "...",
            "title": "...",
            ... all fields except embeddings ...
        }
    }
    """
    # Find product by ID
    product = next((p for p in products if p.get('productId') == product_id), None)

    if not product:
        return jsonify({'error': 'Product not found'}), 404

    # Return full product data but exclude embeddings (too large for API response)
    product_data = {k: v for k, v in product.items()
                    if k not in ['embeddingFlat', 'embeddingOnModel']}

    return jsonify({'product': product_data})

@app.route('/similar', methods=['POST'])
def similar():
    """
    Find similar products to a given product.

    Request:
    {
        "productIndex": 123,
        "limit": 10
    }
    """
    data = request.json
    product_index = data.get('productIndex')
    limit = data.get('limit', 10)

    if product_index is None:
        return jsonify({'error': 'productIndex required'}), 400

    if embeddings is None or len(embeddings) == 0:
        return jsonify({'error': 'No embeddings loaded'}), 500

    # Find the embedding index
    try:
        emb_index = product_ids.index(product_index)
    except ValueError:
        return jsonify({'error': 'Product not found'}), 404

    query_embedding = embeddings[emb_index]

    # Compute similarities
    similarities = np.dot(embeddings, query_embedding)

    # Get top results (excluding self)
    top_indices = np.argsort(similarities)[::-1]

    results = []
    for idx in top_indices:
        if len(results) >= limit + 1:
            break

        product_idx = product_ids[idx]
        if product_idx == product_index:
            continue  # Skip self

        product = products[product_idx]
        score = float(similarities[idx])

        # Return lightweight product preview (not full object with embeddings)
        results.append({
            'productId': product.get('productId'),
            'title': product.get('title'),
            'brand': product.get('brand'),
            'price': product.get('price'),
            'imageUrl': product.get('imageUrl'),
            'productType1': product.get('productType1'),
            'productType2': product.get('productType2'),
            'department': product.get('department'),
            'simplifiedColors': product.get('simplifiedColors', []),
            'score': score
        })

    return jsonify({'results': results[:limit]})

# Style concepts ontology (Nordstrom-specific)
STYLE_CONCEPTS = {
    'pillars': [
        'romantic fashion style outfit',
        'classic fashion style outfit',
        'casual fashion style outfit',
        'dramatic fashion style outfit',
        'creative fashion style outfit',
        'alluring fashion style outfit',
        'modern fashion style outfit',
        'natural fashion style outfit',
        'timeless fashion style outfit'
    ],
    'sub_terms': {
        'romantic': [
            'timeless classic outfit', 'sophisticated outfit', 'polished outfit',
            'dressy outfit', 'chic outfit', 'classic chic outfit', 'tailored outfit',
            'timeless outfit', 'menswear-inspired outfit', 'nautical outfit',
            'preppy outfit', 'heritage outfit', 'romantic minimal outfit',
            'effortless romantic outfit', 'ladylike outfit', 'delicate outfit',
            'ethereal outfit', 'dandy menswear outfit', 'feminine outfit', 'whimsical outfit'
        ],
        'classic': [
            'timeless classic outfit', 'sophisticated outfit', 'polished outfit',
            'dressy outfit', 'chic outfit', 'classic chic outfit', 'tailored outfit',
            'menswear-inspired outfit', 'nautical outfit', 'preppy outfit', 'heritage outfit'
        ],
        'minimal': [
            'modern minimal outfit', 'sleek outfit', 'modern outfit', 'monochromatic outfit',
            'elegant outfit', 'architectural outfit', 'refined outfit', 'understated outfit'
        ],
        'bohemian': [
            'free-spirited outfit', 'natural outfit', 'hippie outfit', 'worldly outfit',
            'vintage-inspired outfit', 'beachy outfit', 'artisanal outfit', 'eclectic outfit',
            'artistic outfit', 'tropical outfit'
        ],
        'maximal': [
            'daring maximal outfit', 'vibrant outfit', 'exotic outfit', 'bold outfit',
            'quirky outfit', 'glam outfit'
        ],
        'streetwear': [
            'streetwear outfit', 'urban outfit', 'edgy outfit', 'tomboy outfit'
        ],
        'utility': [
            'military outfit', 'utility streetwear outfit', 'workwear outfit',
            'utility workwear outfit', 'rugged outfit', 'safari outfit',
            'outdoorsy outfit', 'western outfit'
        ],
        'athletic': [
            'street sport outfit', 'performance outfit', 'club sport outfit',
            'athleisure outfit', 'sporty casual outfit'
        ],
        'casual': [
            'pragmatic casual outfit', 'smart casual outfit', 'relaxed classic outfit'
        ]
    },
    'vibes': [
        'fresh fashion', 'bold fashion', 'confident fashion', 'understated fashion',
        'playful fashion', 'dreamy fashion', 'edgy fashion', 'polished fashion',
        'relaxed fashion', 'effortless fashion', 'romantic fashion', 'dramatic fashion',
        'earthy fashion', 'vibrant fashion', 'mysterious fashion', 'minimal fashion',
        'luxe fashion', 'sporty fashion', 'intellectual fashion', 'whimsical fashion',
        'nostalgic fashion', 'coastal fashion', 'maximalist fashion', 'urban fashion',
        'wanderlust fashion', 'artsy fashion', 'sophisticated fashion', 'timeless fashion'
    ],
    'occasions': [
        'everyday casual outfit', 'brunch outfit', 'date night outfit',
        'girls night out outfit', 'casual dinner outfit', 'work from home outfit',
        'office casual outfit', 'business professional outfit', 'business meeting outfit',
        'wedding guest outfit', 'cocktail party outfit', 'black tie outfit',
        'graduation outfit', 'baby shower outfit', 'beach outfit', 'pool outfit',
        'vacation outfit', 'resort outfit', 'festival outfit', 'concert outfit',
        'farmers market outfit', 'hiking outfit', 'running outfit', 'gym outfit',
        'yoga outfit', 'golf outfit', 'tennis outfit', 'ski outfit',
        'snowboard outfit', 'travel outfit', 'city exploring outfit',
        'weekend errands outfit', 'school outfit', 'night out outfit'
    ]
}

@app.route('/embed-image', methods=['POST'])
def embed_image():
    """
    Generate CLIP embedding for a lifestyle image.

    Request:
    {
        "imageUrl": "https://...",
        "imageData": "data:image/jpeg;base64,..." (alternative to imageUrl)
    }

    Response:
    {
        "embedding": [0.123, -0.456, ...],
        "dimensions": 768,
        "processingTime": 0.234
    }
    """
    start_time = time.time()

    if model is None or preprocess is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.json
        image_url = data.get('imageUrl')
        image_data = data.get('imageData')

        if not image_url and not image_data:
            return jsonify({'error': 'Either imageUrl or imageData required'}), 400

        # Load image
        if image_url:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            image = Image.open(BytesIO(response.content)).convert('RGB')
        else:
            # Handle base64 data
            import base64
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            image_bytes = base64.b64decode(image_data)
            image = Image.open(BytesIO(image_bytes)).convert('RGB')

        # Preprocess and encode
        image_input = preprocess(image).unsqueeze(0)

        with torch.no_grad():
            embedding = model.encode_image(image_input, normalize=True)
            embedding = embedding.cpu().numpy()[0]

        processing_time = time.time() - start_time

        return jsonify({
            'embedding': embedding.tolist(),
            'dimensions': len(embedding),
            'processingTime': processing_time
        })

    except requests.RequestException as e:
        return jsonify({'error': f'Failed to fetch image: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Failed to process image: {str(e)}'}), 500

@app.route('/embed-text', methods=['POST'])
def embed_text():
    """
    Generate CLIP embedding for text query.

    Request:
    {
        "text": "romantic date night outfit"
    }

    Response:
    {
        "embedding": [0.123, -0.456, ...],
        "dimensions": 768,
        "processingTime": 0.012
    }
    """
    start_time = time.time()

    if model is None or tokenizer is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.json
        text = data.get('text')

        if not text:
            return jsonify({'error': 'text parameter required'}), 400

        # Tokenize and encode
        text_tokens = tokenizer([text])

        with torch.no_grad():
            embedding = model.encode_text(text_tokens, normalize=True)
            embedding = embedding.cpu().numpy()[0]

        processing_time = time.time() - start_time

        return jsonify({
            'embedding': embedding.tolist(),
            'dimensions': len(embedding),
            'processingTime': processing_time
        })

    except Exception as e:
        return jsonify({'error': f'Failed to encode text: {str(e)}'}), 500

@app.route('/embed-concepts', methods=['POST'])
def embed_concepts():
    """
    Pre-compute embeddings for all style concepts (pillars, sub-terms, vibes, occasions).

    Request:
    {
        "categories": ["pillars", "vibes", "occasions"],  // optional, defaults to all
        "useCache": true  // optional, return cached if available
    }

    Response:
    {
        "pillars": {
            "romantic fashion style outfit": [0.123, ...],
            "classic fashion style outfit": [0.456, ...],
            ...
        },
        "vibes": {
            "bold fashion": [0.789, ...],
            ...
        },
        "occasions": {
            "date night outfit": [0.012, ...],
            ...
        },
        "metadata": {
            "totalConcepts": 180,
            "processingTime": 2.345,
            "cached": false
        }
    }
    """
    global style_concept_embeddings

    start_time = time.time()

    if model is None or tokenizer is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.json if request.json else {}
        categories = data.get('categories', ['pillars', 'sub_terms', 'vibes', 'occasions'])
        use_cache = data.get('useCache', True)

        # Return cached if available and requested
        if use_cache and style_concept_embeddings is not None:
            return jsonify({
                **style_concept_embeddings,
                'metadata': {
                    **style_concept_embeddings['metadata'],
                    'cached': True,
                    'requestTime': time.time() - start_time
                }
            })

        result = {}
        total_concepts = 0

        # Embed pillars
        if 'pillars' in categories:
            pillar_embeddings = {}
            for pillar in STYLE_CONCEPTS['pillars']:
                text_tokens = tokenizer([pillar])
                with torch.no_grad():
                    embedding = model.encode_text(text_tokens, normalize=True)
                    pillar_embeddings[pillar] = embedding.cpu().numpy()[0].tolist()
                total_concepts += 1
            result['pillars'] = pillar_embeddings

        # Embed sub-terms
        if 'sub_terms' in categories:
            sub_term_embeddings = {}
            for pillar, terms in STYLE_CONCEPTS['sub_terms'].items():
                sub_term_embeddings[pillar] = {}
                for term in terms:
                    text_tokens = tokenizer([term])
                    with torch.no_grad():
                        embedding = model.encode_text(text_tokens, normalize=True)
                        sub_term_embeddings[pillar][term] = embedding.cpu().numpy()[0].tolist()
                    total_concepts += 1
            result['sub_terms'] = sub_term_embeddings

        # Embed vibes
        if 'vibes' in categories:
            vibe_embeddings = {}
            for vibe in STYLE_CONCEPTS['vibes']:
                text_tokens = tokenizer([vibe])
                with torch.no_grad():
                    embedding = model.encode_text(text_tokens, normalize=True)
                    vibe_embeddings[vibe] = embedding.cpu().numpy()[0].tolist()
                total_concepts += 1
            result['vibes'] = vibe_embeddings

        # Embed occasions
        if 'occasions' in categories:
            occasion_embeddings = {}
            for occasion in STYLE_CONCEPTS['occasions']:
                text_tokens = tokenizer([occasion])
                with torch.no_grad():
                    embedding = model.encode_text(text_tokens, normalize=True)
                    occasion_embeddings[occasion] = embedding.cpu().numpy()[0].tolist()
                total_concepts += 1
            result['occasions'] = occasion_embeddings

        processing_time = time.time() - start_time

        result['metadata'] = {
            'totalConcepts': total_concepts,
            'processingTime': processing_time,
            'cached': False,
            'categories': categories
        }

        # Cache for future requests
        style_concept_embeddings = result

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': f'Failed to embed concepts: {str(e)}'}), 500

@app.route('/semantic-search', methods=['POST'])
def semantic_search():
    """
    Unified semantic search across products and style concepts.

    Request:
    {
        "query": "romantic date night outfit",  // text query
        "imageUrl": "https://...",  // OR image query
        "searchProducts": true,
        "searchConcepts": true,
        "conceptCategories": ["pillars", "vibes"],  // optional
        "limit": 20,
        "filters": {...}  // same as /search filters
    }

    Response:
    {
        "products": [
            {
                "productId": "...",
                "title": "...",
                "score": 0.85,
                ...
            }
        ],
        "concepts": {
            "pillars": [
                {
                    "name": "romantic fashion style outfit",
                    "score": 0.92
                }
            ],
            "vibes": [
                {
                    "name": "dreamy fashion",
                    "score": 0.88
                }
            ]
        },
        "metadata": {
            "queryType": "text",
            "processingTime": 0.234
        }
    }
    """
    start_time = time.time()

    if model is None:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.json
        query_text = data.get('query')
        query_image_url = data.get('imageUrl')
        search_products = data.get('searchProducts', True)
        search_concepts = data.get('searchConcepts', False)
        concept_categories = data.get('conceptCategories', ['pillars', 'vibes'])
        limit = data.get('limit', 20)
        filters = data.get('filters', {})

        if not query_text and not query_image_url:
            return jsonify({'error': 'Either query or imageUrl required'}), 400

        # Generate query embedding
        if query_image_url:
            # Image query
            response = requests.get(query_image_url, timeout=10)
            image = Image.open(BytesIO(response.content)).convert('RGB')
            image_input = preprocess(image).unsqueeze(0)
            with torch.no_grad():
                query_embedding = model.encode_image(image_input, normalize=True)
                query_embedding = query_embedding.cpu().numpy()[0]
            query_type = 'image'
        else:
            # Text query
            text_tokens = tokenizer([query_text])
            with torch.no_grad():
                query_embedding = model.encode_text(text_tokens, normalize=True)
                query_embedding = query_embedding.cpu().numpy()[0]
            query_type = 'text'

        result = {}

        # Search products
        if search_products and embeddings is not None and len(embeddings) > 0:
            similarities = np.dot(embeddings, query_embedding)
            top_indices = np.argsort(similarities)[::-1]

            product_results = []
            for idx in top_indices:
                if len(product_results) >= limit:
                    break

                product_idx = product_ids[idx]
                product = products[product_idx]
                score = float(similarities[idx])

                # Apply filters
                if filters:
                    if 'productType1' in filters and product.get('productType1') != filters['productType1']:
                        continue
                    if 'productType2' in filters and product.get('productType2') != filters['productType2']:
                        continue
                    if 'gender' in filters and product.get('gender') not in filters['gender']:
                        continue
                    if 'department' in filters and product.get('department') not in filters['department']:
                        continue
                    if 'colors' in filters and filters['colors']:
                        product_colors = product.get('simplifiedColors', [])
                        has_matching_color = any(
                            color in product_colors for color in filters['colors']
                        )
                        if not has_matching_color:
                            continue

                product_results.append({
                    'productId': product.get('productId'),
                    'title': product.get('title'),
                    'brand': product.get('brand'),
                    'price': product.get('price'),
                    'imageUrl': product.get('imageUrl'),
                    'productType1': product.get('productType1'),
                    'productType2': product.get('productType2'),
                    'department': product.get('department'),
                    'simplifiedColors': product.get('simplifiedColors', []),
                    'score': score
                })

            result['products'] = product_results

        # Search concepts
        if search_concepts:
            # Load concept embeddings if not cached
            if style_concept_embeddings is None:
                embed_concepts()  # This will populate the cache

            concept_results = {}

            for category in concept_categories:
                if category == 'pillars' and 'pillars' in style_concept_embeddings:
                    pillar_scores = []
                    for name, emb in style_concept_embeddings['pillars'].items():
                        emb_array = np.array(emb, dtype=np.float32)
                        score = float(np.dot(emb_array, query_embedding))
                        pillar_scores.append({'name': name, 'score': score})
                    pillar_scores.sort(key=lambda x: x['score'], reverse=True)
                    concept_results['pillars'] = pillar_scores[:10]

                elif category == 'vibes' and 'vibes' in style_concept_embeddings:
                    vibe_scores = []
                    for name, emb in style_concept_embeddings['vibes'].items():
                        emb_array = np.array(emb, dtype=np.float32)
                        score = float(np.dot(emb_array, query_embedding))
                        vibe_scores.append({'name': name, 'score': score})
                    vibe_scores.sort(key=lambda x: x['score'], reverse=True)
                    concept_results['vibes'] = vibe_scores[:10]

                elif category == 'occasions' and 'occasions' in style_concept_embeddings:
                    occasion_scores = []
                    for name, emb in style_concept_embeddings['occasions'].items():
                        emb_array = np.array(emb, dtype=np.float32)
                        score = float(np.dot(emb_array, query_embedding))
                        occasion_scores.append({'name': name, 'score': score})
                    occasion_scores.sort(key=lambda x: x['score'], reverse=True)
                    concept_results['occasions'] = occasion_scores[:10]

            result['concepts'] = concept_results

        processing_time = time.time() - start_time

        result['metadata'] = {
            'queryType': query_type,
            'processingTime': processing_time
        }

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': f'Semantic search failed: {str(e)}'}), 500

def main():
    """Initialize and run the server."""
    import os

    # Get port from environment (Hugging Face Spaces uses 7860)
    port = int(os.environ.get('PORT', 5002))

    print("=" * 70)
    print("CLIP Search API Service")
    print("=" * 70)

    load_model()
    load_embeddings_and_products()

    print(f"\nStarting server on port {port}")
    print("=" * 70)

    app.run(host='0.0.0.0', port=port, debug=False)

if __name__ == '__main__':
    main()
