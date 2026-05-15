#!/usr/bin/env python3
"""
Export Conflicts for Visual Review

Creates an HTML file with 30 random conflicts showing images
for manual review
"""

import json
import os
import random
from dotenv import load_dotenv
load_dotenv('.env.local')

from supabase import create_client, Client

SUPABASE_URL = os.getenv('NEXT_PUBLIC_SUPABASE_URL')
SUPABASE_SERVICE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY')

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

print("📦 Exporting Conflicts for Visual Review\n")

# Get 30 random products with rules-based attributes
print("Loading random products...")
response = supabase.table('products').select(
    'product_id, title, image_url, '
    'materials, materials_confidence, '
    'fit, fit_confidence, '
    'sleeve_style, sleeve_style_confidence, '
    'neckline, neckline_confidence'
).not_.is_('materials', 'null').limit(500).execute()

products = response.data
random.shuffle(products)
sample = products[:30]

print(f"Selected {len(sample)} products for conflict generation\n")

# For demo purposes, we'll use these as if they had AI conflicts
# In production, you'd run AI on these and capture real conflicts
conflicts_data = []

for product in sample:
    # Create a mock conflict entry
    conflict = {
        'product_id': product['product_id'],
        'title': product['title'],
        'image_url': product['image_url'],
        'conflicts': []
    }

    # Add material conflict if exists
    if product.get('materials'):
        conflict['conflicts'].append({
            'attribute': 'materials',
            'rules': product['materials'],
            'rules_confidence': product.get('materials_confidence', 95),
            'ai': ['[AI result would go here]'],
            'ai_confidence': 90,
        })

    # Add fit conflict if exists
    if product.get('fit'):
        conflict['conflicts'].append({
            'attribute': 'fit',
            'rules': product['fit'],
            'rules_confidence': product.get('fit_confidence', 80),
            'ai': '[AI result would go here]',
            'ai_confidence': 90,
        })

    if conflict['conflicts']:
        conflicts_data.append(conflict)

# Create HTML review tool
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
            margin-bottom: 20px;
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
            Download Results
        </button>
    </div>

    <script>
        const conflicts = """ + json.dumps(conflicts_data, indent=2) + """;

        let currentIndex = 0;
        let results = [];

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
            `;

            conflict.conflicts.forEach((c, i) => {
                html += `
                    <div class="conflict-item">
                        <div class="conflict-header">${c.attribute}</div>
                        <div class="conflict-options">
                            <div class="option" onclick="selectOption(${index}, ${i}, 'rules')">
                                <div class="option-label">Rules Said:</div>
                                <div class="option-value">${Array.isArray(c.rules) ? c.rules.join(', ') : c.rules}</div>
                                <div class="option-confidence">${c.rules_confidence}% confidence</div>
                            </div>
                            <div class="option" onclick="selectOption(${index}, ${i}, 'ai')">
                                <div class="option-label">AI Said:</div>
                                <div class="option-value">${Array.isArray(c.ai) ? c.ai.join(', ') : c.ai}</div>
                                <div class="option-confidence">${c.ai_confidence}% confidence</div>
                            </div>
                            <div class="option" onclick="selectOption(${index}, ${i}, 'semantic')">
                                <div class="option-label">Both Correct</div>
                                <div class="option-value">Semantic difference</div>
                                <div class="option-confidence">Not an error</div>
                            </div>
                        </div>
                    </div>
                `;
            });

            html += `
                        </div>
                    </div>
                </div>
            `;

            container.innerHTML = html;
            document.getElementById('progress').textContent = `Product ${index + 1} of ${conflicts.length}`;
        }

        function selectOption(conflictIndex, attributeIndex, choice) {
            // Store result
            if (!results[conflictIndex]) {
                results[conflictIndex] = {};
            }
            results[conflictIndex][attributeIndex] = choice;

            // Visual feedback
            const options = document.querySelectorAll('.conflict-item')[attributeIndex].querySelectorAll('.option');
            options.forEach(opt => opt.classList.remove('selected'));

            if (choice === 'rules') options[0].classList.add('selected');
            else if (choice === 'ai') options[1].classList.add('selected');
            else if (choice === 'semantic') options[2].classList.add('selected');
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

            // Calculate stats
            let rulesWins = 0;
            let aiWins = 0;
            let semantic = 0;

            results.forEach(result => {
                Object.values(result).forEach(choice => {
                    if (choice === 'rules') rulesWins++;
                    else if (choice === 'ai') aiWins++;
                    else if (choice === 'semantic') semantic++;
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
                conflicts: conflicts
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'conflict-review-results.json';
            a.click();
        }

        // Initialize
        renderConflict(0);
    </script>
</body>
</html>
"""

# Save HTML file
output_file = 'conflict-review.html'
with open(output_file, 'w') as f:
    f.write(html)

print(f"✅ Created review tool: {output_file}")
print(f"   Open in browser: open {output_file}")
print(f"\n💡 NOTE: This demo uses mock AI results")
print(f"   To get real conflicts, run the AI validation test first")
