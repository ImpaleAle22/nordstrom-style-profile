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

app = Flask(__name__)
CORS(app)

# Static file paths
SCRIPTS_DIR = Path(__file__).parent.parent.parent / "scripts"
PRODUCT_IMAGES_DIR = SCRIPTS_DIR / "product-images"

# Global state
model = None
tokenizer = None
products = []
embeddings = None
product_ids = []

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
    global products, embeddings, product_ids, image_gaps

    print("Loading products and embeddings...")

    # Try lightweight file first (for deployment), then fall back to full file
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

        # Lightweight file already has imageUrl and embeddings ready
        # Just extract embeddings into numpy array
        embeddings_list = []
        product_ids_list = []

        for i, product in enumerate(products):
            emb = product.get('embeddingFlat') or product.get('embeddingOnModel')
            imageUrl = product.get('imageUrl', '')

            if emb and imageUrl:
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
    """Load FashionSigLIP model for text encoding."""
    global model, tokenizer

    print("Loading FashionSigLIP model...")
    model, _, _ = open_clip.create_model_and_transforms('hf-hub:Marqo/marqo-fashionSigLIP')
    tokenizer = open_clip.get_tokenizer('hf-hub:Marqo/marqo-fashionSigLIP')
    model.eval()
    print("  Model loaded")

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

    PERFORMANCE: Returns lightweight product previews (not full objects with embeddings).
    Use /product/:id endpoint to fetch full product details for PDP.

    IMPORTANT: Product embeddings must be generated from detail_desc (descriptive text),
    not SKU names or short titles. FashionSigLIP requires 1-2 sentence descriptions
    of garment type, fit, material, and key details.

    Validated similarity threshold: 0.08 (95% recall, 45.6% precision)
    - Matching pairs (image + own detail_desc): mean=0.128, median=0.126
    - Non-matching pairs: mean=-0.041, median=-0.047

    GET Request: /search?q=query&type=Tops&limit=20&offset=0
    POST Request: {"query": "...", "limit": 20, "offset": 0, "filters": {...}}

    Response (lightweight - only preview fields):
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

    For full product details, use: GET /product/:productId
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
        # EXPANDED: Include rich metadata for better tagging (Phase 2: CLIP API Enhancement)
        all_results.append({
            # Core fields (existing)
            'productId': product.get('productId'),
            'title': product.get('title'),
            'brand': product.get('brand'),
            'price': product.get('price'),
            'imageUrl': product.get('imageUrl'),
            'productType1': product.get('productType1'),
            'productType2': product.get('productType2'),
            'department': product.get('department'),
            'simplifiedColors': product.get('simplifiedColors', []),
            'score': score,

            # Rich metadata (existing from Phase 1)
            'description': product.get('description', ''),  # H&M product descriptions
            'materials': product.get('materials', []),
            'patterns': product.get('patterns', ''),
            'silhouette': product.get('silhouette', ''),
            'garmentLength': product.get('garmentLength', ''),
            'neckline': product.get('neckline', ''),
            'sleeveStyle': product.get('sleeveStyle', ''),
            'fitDetails': product.get('fitDetails', ''),
            'details': product.get('details', []),
            'productType3': product.get('productType3', ''),
            'productType4': product.get('productType4', ''),
            'weatherContext': product.get('weatherContext', []),
            'productFeatures': product.get('productFeatures', []),

            # Vision metadata (AI-analyzed attributes)
            'visualAttributes': visual_attrs,
            'visionReasoning': vision_reasoning,

            # NEW FIELDS - Phase 2: Stop Data Pipeline Leak
            # Product-level tags (for outfit tagging)
            'occasions': product.get('occasions', []),           # ["Casual", "Weekend"]
            'seasons': product.get('seasons', []),               # ["Spring", "Fall"]
            'activityContext': product.get('activityContext', []), # ["City Stroll", "Brunch"]

            # AI-enriched descriptions (for better context)
            'comprehensiveDescription': ai_descriptions.get('comprehensive', ''),  # Full 900+ char description
            'stylistDescription': ai_descriptions.get('stylist', ''),              # Styling suggestions

            # AI-enriched lifestyle attributes (for tagging logic)
            'formalityTier': ai_lifestyle.get('formalityTier', {}).get('tier', '') if isinstance(ai_lifestyle.get('formalityTier'), dict) else '',  # "casual", "smart-casual", "formal"
            'versatilityScore': ai_lifestyle.get('versatilityScore', {}).get('score') if isinstance(ai_lifestyle.get('versatilityScore'), dict) else None,  # 1-10 rating
            'lifestyleOccasions': ai_lifestyle.get('occasions', []),  # More granular than product.occasions
            'trendTags': ai_lifestyle.get('trendTags', []),          # ["Classic", "Striped", "Casual"]

            # Material composition (for advanced filtering)
            'materialAttributes': product.get('materialAttributes', {}),  # Detailed material breakdown
            'patternAttributes': product.get('patternAttributes', {}),    # Pattern details
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

def main():
    """Initialize and run the server."""
    print("=" * 70)
    print("CLIP Search API Service")
    print("=" * 70)

    load_model()
    load_embeddings_and_products()

    print("\nStarting server on http://localhost:5002")
    print("=" * 70)

    app.run(host='0.0.0.0', port=5002, debug=False)

if __name__ == '__main__':
    main()
