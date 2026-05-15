#!/usr/bin/env python3
"""
Create Conflict Reviewer from Test Results

Uses the actual conflicts detected in the AI validation test
"""

import json
import os
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📦 Creating Conflict Reviewer from Test Results\n")

# Real conflicts from the test (first 30)
test_conflicts = [
    ('hm-kaggle-0904584003', 'neckline', 'Collared', None, 'mock neck', 90),
    ('hm-kaggle-0917294003', 'fit', 'oversized', 84, 'relaxed', 90),
    ('hm-kaggle-0908927001', 'fit', 'fitted', 75, 'relaxed', 95),
    ('hm-kaggle-0908927001', 'neckline', 'v-neck', 75, 'collared', 95),
    ('hm-kaggle-0918249001', 'materials', ['Tencel', 'Lyocell'], 95, ['denim'], 90),
    ('hm-kaggle-0918249001', 'sleeve_style', 'Long Sleeve', 85, '3/4 sleeve', 90),
    ('hm-kaggle-0920610001', 'fit', 'oversized', 80, 'relaxed', 90),
    ('hm-kaggle-0920610001', 'neckline', 'Collared', None, 'lapel', 90),
    ('hm-kaggle-0904999002', 'sleeve_style', 'raglan', 85, 'long sleeve', 90),
    ('hm-kaggle-0915567001', 'materials', ['jersey'], 95, ['viscose'], 90),
    ('hm-kaggle-0905890004', 'materials', ['viscose', 'twill'], 95, ['cotton'], 90),
    ('hm-kaggle-0916866001', 'materials', ['woven'], 95, ['cotton'], 90),
    ('hm-kaggle-0904357002', 'materials', ['jersey'], 95, ['polyester'], 95),
    ('hm-kaggle-0903934004', 'materials', ['viscose'], 95, ['polyester'], 91),
    ('hm-kaggle-0903934004', 'neckline', 'Collared', None, 'mock neck', 91),
    ('hm-kaggle-0906645010', 'materials', ['jersey'], 95, ['polyester'], 90),
    ('hm-kaggle-0906293002', 'materials', ['ribbed', 'jersey'], 95, ['ribbed knit'], 90),
    ('hm-kaggle-0910445001', 'materials', ['stretch'], 95, ['faux leather'], 90),
    ('hm-kaggle-0920500001', 'sleeve_style', 'cold shoulder', 88, 'short sleeve', 95),
    ('hm-kaggle-0915523003', 'neckline', 'Collared', None, 'round neck', 90),
    ('hm-kaggle-0905660002', 'materials', ['viscose'], 95, ['polyester'], 90),
    ('hm-kaggle-0903851001', 'materials', ['jersey'], 95, ['cotton'], 90),
    ('hm-kaggle-0903910002', 'materials', ['viscose', 'twill'], 95, ['cotton'], 90),
    ('hm-kaggle-0918649001', 'fit', 'oversized', 80, 'relaxed', 90),
    ('hm-kaggle-0918240004', 'materials', ['jersey'], 95, ['polyester'], 90),
    ('hm-kaggle-0915523001', 'neckline', 'Collared', None, 'round neck', 90),
    ('hm-kaggle-0907696004', 'fit', 'oversized', 80, 'relaxed', 95),
    ('hm-kaggle-0913688002', 'fit', 'Regular Fit', None, 'relaxed', 90),
    ('hm-kaggle-0908467001', 'fit', 'oversized', 80, 'relaxed', 90),
    ('hm-kaggle-0915092001', 'materials', ['viscose'], 95, ['polyester'], 90),
]

# Group by product
conflicts_by_product = {}
for product_id, attr, rules, rules_conf, ai, ai_conf in test_conflicts:
    if product_id not in conflicts_by_product:
        conflicts_by_product[product_id] = []
    conflicts_by_product[product_id].append({
        'attribute': attr,
        'rules': rules,
        'rules_confidence': rules_conf or 95,
        'ai': ai,
        'ai_confidence': ai_conf
    })

# Get product data for each, including descriptions from extracted file
descriptions = {}
with open('extracted-attributes.jsonl', 'r') as f:
    for line in f:
        item = json.loads(line)
        if 'description' in item:
            descriptions[item['product_id']] = item['description']

conflicts_data = []
for product_id, conflict_list in list(conflicts_by_product.items())[:30]:
    response = supabase.table('products').select(
        'product_id, title, image_url'
    ).eq('product_id', product_id).execute()

    if response.data:
        product = response.data[0]
        conflicts_data.append({
            'product_id': product['product_id'],
            'title': product['title'],
            'image_url': product['image_url'],
            'description': descriptions.get(product_id, 'No description available'),
            'conflicts': conflict_list
        })

print(f"Loaded {len(conflicts_data)} products with conflicts\n")

# Create HTML (same as before but with real data)
html_template = open('scripts/export-conflicts-for-review.py', 'r').read()

# Extract just the HTML part and inject real data
html = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Conflict Review - Rules vs AI</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 40px;
            background: #f5f5f5;
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .progress {
            text-align: center;
            font-size: 18px;
            margin-bottom: 20px;
            color: #666;
        }
        .conflict-card {
            background: white;
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .product-info {
            display: flex;
            gap: 30px;
            margin-bottom: 30px;
        }
        .product-image {
            flex-shrink: 0;
        }
        .product-image img {
            width: 300px;
            height: 400px;
            object-fit: cover;
            border-radius: 8px;
            border: 1px solid #ddd;
        }
        .product-details {
            flex: 1;
        }
        .product-title {
            font-size: 24px;
            font-weight: 600;
            margin-bottom: 10px;
        }
        .product-id {
            color: #666;
            font-size: 14px;
            margin-bottom: 10px;
        }
        .product-description {
            background: #f9f9f9;
            padding: 15px;
            border-radius: 6px;
            font-size: 14px;
            line-height: 1.6;
            color: #555;
            margin-bottom: 20px;
            max-height: 150px;
            overflow-y: auto;
        }
        .description-label {
            font-weight: 600;
            color: #333;
            margin-bottom: 5px;
        }
        .conflict-item {
            background: #f9f9f9;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 15px;
        }
        .conflict-header {
            font-size: 16px;
            font-weight: 600;
            margin-bottom: 15px;
            color: #333;
            text-transform: uppercase;
        }
        .conflict-options {
            display: flex;
            gap: 20px;
            margin-top: 15px;
        }
        .option {
            flex: 1;
            padding: 15px;
            border-radius: 8px;
            border: 2px solid #ddd;
            cursor: pointer;
            transition: all 0.2s;
        }
        .option:hover {
            border-color: #4CAF50;
            background: #f0f8f0;
        }
        .option.selected {
            border-color: #4CAF50;
            background: #e8f5e9;
        }
        .option-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
        }
        .option-value {
            font-size: 16px;
            font-weight: 600;
            color: #333;
        }
        .option-confidence {
            font-size: 12px;
            color: #888;
            margin-top: 5px;
        }
        .notes-section {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
        }
        .notes-label {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        .notes-input {
            width: 100%;
            min-height: 80px;
            padding: 12px;
            border: 2px solid #ddd;
            border-radius: 6px;
            font-size: 14px;
            font-family: inherit;
            resize: vertical;
        }
        .notes-input:focus {
            outline: none;
            border-color: #4CAF50;
        }
        .navigation {
            display: flex;
            justify-content: space-between;
            margin-top: 30px;
        }
        button {
            padding: 12px 24px;
            font-size: 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
        }
        .btn-primary {
            background: #4CAF50;
            color: white;
        }
        .btn-primary:hover {
            background: #45a049;
        }
        .btn-secondary {
            background: #ddd;
            color: #333;
        }
        .btn-secondary:hover {
            background: #ccc;
        }
        .hidden {
            display: none;
        }
        .summary {
            text-align: center;
            padding: 40px;
        }
        .summary h2 {
            margin-bottom: 20px;
        }
        .stats {
            display: flex;
            gap: 30px;
            justify-content: center;
            margin-top: 30px;
        }
        .stat {
            text-align: center;
        }
        .stat-value {
            font-size: 48px;
            font-weight: 600;
            color: #4CAF50;
        }
        .stat-label {
            font-size: 14px;
            color: #666;
            margin-top: 5px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🔍 Conflict Review: Rules vs AI</h1>
        <p>Review visual conflicts and choose which source is more accurate</p>
        <p style="color: #666; font-size: 14px; margin-top: 10px;">
            Use arrow keys: ← Previous | → Next | 1 Rules | 2 AI | 3 Both OK
        </p>
        <p style="color: #4CAF50; font-size: 14px; margin-top: 5px; font-weight: 600;">
            💡 Please add notes explaining your reasoning - it's super helpful!
        </p>
    </div>

    <div class="progress" id="progress"></div>

    <div id="review-container"></div>

    <div class="navigation">
        <button class="btn-secondary" onclick="previousConflict()">← Previous</button>
        <button class="btn-primary" onclick="nextConflict()">Next →</button>
    </div>

    <div id="summary" class="summary hidden">
        <h2>Review Complete!</h2>
        <div class="stats">
            <div class="stat">
                <div class="stat-value" id="rules-wins">0</div>
                <div class="stat-label">Rules Correct</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="ai-wins">0</div>
                <div class="stat-label">AI Correct</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="semantic">0</div>
                <div class="stat-label">Semantic (Both OK)</div>
            </div>
        </div>
        <button class="btn-primary" onclick="downloadResults()" style="margin-top: 30px">
            Download Results as JSON
        </button>
    </div>

    <script>
        const conflicts = """ + json.dumps(conflicts_data, indent=2) + """;

        let currentIndex = 0;
        let results = [];

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') previousConflict();
            else if (e.key === 'ArrowRight') nextConflict();
            else if (e.key === '1' && currentIndex < conflicts.length) {
                const conflict = conflicts[currentIndex];
                conflict.conflicts.forEach((c, i) => selectOption(currentIndex, i, 'rules'));
            }
            else if (e.key === '2' && currentIndex < conflicts.length) {
                const conflict = conflicts[currentIndex];
                conflict.conflicts.forEach((c, i) => selectOption(currentIndex, i, 'ai'));
            }
            else if (e.key === '3' && currentIndex < conflicts.length) {
                const conflict = conflicts[currentIndex];
                conflict.conflicts.forEach((c, i) => selectOption(currentIndex, i, 'semantic'));
            }
        });

        function renderConflict(index) {
            if (index >= conflicts.length) {
                showSummary();
                return;
            }

            const conflict = conflicts[index];
            const container = document.getElementById('review-container');

            let html = `
                <div class="conflict-card">
                    <div class="product-info">
                        <div class="product-image">
                            <img src="${conflict.image_url}" alt="${conflict.title}" />
                        </div>
                        <div class="product-details">
                            <div class="product-title">${conflict.title}</div>
                            <div class="product-id">${conflict.product_id}</div>
                            <div class="product-description">
                                <div class="description-label">Description (what rules extracted from):</div>
                                ${conflict.description || 'No description available'}
                            </div>
            `;

            conflict.conflicts.forEach((c, i) => {
                const rulesValue = Array.isArray(c.rules) ? c.rules.join(', ') : c.rules;
                const aiValue = Array.isArray(c.ai) ? c.ai.join(', ') : c.ai;

                html += `
                    <div class="conflict-item">
                        <div class="conflict-header">${c.attribute}</div>
                        <div class="conflict-options">
                            <div class="option ${results[index]?.[i] === 'rules' ? 'selected' : ''}" onclick="selectOption(${index}, ${i}, 'rules')">
                                <div class="option-label">Rules Said: (Press 1)</div>
                                <div class="option-value">${rulesValue}</div>
                                <div class="option-confidence">${c.rules_confidence}% confidence</div>
                            </div>
                            <div class="option ${results[index]?.[i] === 'ai' ? 'selected' : ''}" onclick="selectOption(${index}, ${i}, 'ai')">
                                <div class="option-label">AI Said: (Press 2)</div>
                                <div class="option-value">${aiValue}</div>
                                <div class="option-confidence">${c.ai_confidence}% confidence</div>
                            </div>
                            <div class="option ${results[index]?.[i] === 'semantic' ? 'selected' : ''}" onclick="selectOption(${index}, ${i}, 'semantic')">
                                <div class="option-label">Both Correct (Press 3)</div>
                                <div class="option-value">Semantic difference</div>
                                <div class="option-confidence">Not an error</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                        <div class="notes-section">
                            <div class="notes-label">Notes / Reasoning (optional but helpful!):</div>
                            <textarea
                                class="notes-input"
                                placeholder="Why did you make this selection? What did you notice in the image vs description?"
                                onchange="saveNotes(${index}, this.value)"
                            >${results[index]?.notes || ''}</textarea>
                        </div>
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            document.getElementById('progress').textContent = `Product ${index + 1} of ${conflicts.length}`;
        }

        function selectOption(conflictIndex, attributeIndex, choice) {
            if (!results[conflictIndex]) {
                results[conflictIndex] = {};
            }
            results[conflictIndex][attributeIndex] = choice;

            // Re-render to update selection
            renderConflict(currentIndex);
        }

        function saveNotes(conflictIndex, notes) {
            if (!results[conflictIndex]) {
                results[conflictIndex] = {};
            }
            results[conflictIndex].notes = notes;
        }

        function nextConflict() {
            currentIndex++;
            renderConflict(currentIndex);
        }

        function previousConflict() {
            if (currentIndex > 0) {
                currentIndex--;
                renderConflict(currentIndex);
            }
        }

        function showSummary() {
            document.getElementById('review-container').classList.add('hidden');
            document.querySelector('.navigation').classList.add('hidden');
            document.getElementById('summary').classList.remove('hidden');

            let rulesWins = 0;
            let aiWins = 0;
            let semantic = 0;

            results.forEach(result => {
                Object.entries(result).forEach(([key, value]) => {
                    if (key !== 'notes') {
                        if (value === 'rules') rulesWins++;
                        else if (value === 'ai') aiWins++;
                        else if (value === 'semantic') semantic++;
                    }
                });
            });

            document.getElementById('rules-wins').textContent = rulesWins;
            document.getElementById('ai-wins').textContent = aiWins;
            document.getElementById('semantic').textContent = semantic;
        }

        function downloadResults() {
            const data = {
                reviewed: conflicts.length,
                results: results,
                conflicts: conflicts,
                summary: {
                    rules_wins: parseInt(document.getElementById('rules-wins').textContent),
                    ai_wins: parseInt(document.getElementById('ai-wins').textContent),
                    semantic: parseInt(document.getElementById('semantic').textContent)
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'conflict-review-results.json';
            a.click();
        }

        renderConflict(0);
    </script>
</body>
</html>
"""

output_file = 'conflict-review.html'
with open(output_file, 'w') as f:
    f.write(html)

print(f"✅ Created conflict reviewer: {output_file}")
print(f"\n🚀 Open it now:")
print(f"   open {output_file}")
print(f"\n⌨️  Keyboard shortcuts:")
print(f"   Arrow keys: Navigate")
print(f"   1: Rules correct")
print(f"   2: AI correct")
print(f"   3: Both OK (semantic)")
