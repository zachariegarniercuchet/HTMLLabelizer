#!/usr/bin/env python3
"""
Inter-Annotator Agreement (IAA) Analysis
Analyzes 2+ annotated HTML files and computes agreement metrics
"""

import sys
import json
from pathlib import Path
from bs4 import BeautifulSoup
from collections import defaultdict, Counter
import argparse


def parse_html_labels(html_file):
    """Extract all manual labels from HTML file"""
    # Try different encodings
    for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
        try:
            with open(html_file, 'r', encoding=encoding) as f:
                soup = BeautifulSoup(f.read(), 'html.parser')
                break
        except UnicodeDecodeError:
            continue
    else:
        # If all encodings fail, read as binary and decode with errors='ignore'
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            soup = BeautifulSoup(f.read(), 'html.parser')
    
    labels = []
    for label_tag in soup.find_all('manual_label'):
        label_data = {
            'name': label_tag.get('name', ''),
            'text': label_tag.get_text(strip=True),
            'start_pos': label_tag.sourceline if hasattr(label_tag, 'sourceline') else None
        }
        # Extract all parameters as attributes
        params = {k: v for k, v in label_tag.attrs.items() if k not in ['name', 'style']}
        if params:
            label_data['parameters'] = params
        
        labels.append(label_data)
    
    return labels


def calculate_iaa_metrics(annotators_data):
    """Calculate IAA metrics from multiple annotators"""
    num_annotators = len(annotators_data)
    
    # Count label usage per annotator
    label_counts = {}
    for i, (filename, labels) in enumerate(annotators_data.items()):
        label_names = [l['name'] for l in labels]
        label_counts[filename] = dict(Counter(label_names))
    
    # Get all unique labels across annotators
    all_labels = set()
    for labels in annotators_data.values():
        all_labels.update(l['name'] for l in labels)
    
    # Calculate overlap matrix
    overlap_matrix = {}
    filenames = list(annotators_data.keys())
    for i, file1 in enumerate(filenames):
        for j, file2 in enumerate(filenames):
            if i < j:
                labels1 = set(l['name'] for l in annotators_data[file1])
                labels2 = set(l['name'] for l in annotators_data[file2])
                
                intersection = len(labels1 & labels2)
                union = len(labels1 | labels2)
                
                jaccard = intersection / union if union > 0 else 0
                
                overlap_matrix[f"{Path(file1).stem}_vs_{Path(file2).stem}"] = {
                    "common_labels": intersection,
                    "total_unique_labels": union,
                    "jaccard_similarity": round(jaccard, 3)
                }
    
    # Calculate simple agreement percentage
    total_labels_per_file = {f: len(l) for f, l in annotators_data.items()}
    
    return {
        "summary": {
            "num_annotators": num_annotators,
            "annotators": [Path(f).stem for f in annotators_data.keys()],
            "total_unique_labels": len(all_labels),
            "unique_label_types": sorted(list(all_labels))
        },
        "label_counts": {Path(f).stem: counts for f, counts in label_counts.items()},
        "overlap_analysis": overlap_matrix,
        "statistics": {
            "total_labels_per_annotator": {Path(f).stem: count for f, count in total_labels_per_file.items()},
            "avg_labels_per_annotator": round(sum(total_labels_per_file.values()) / num_annotators, 2) if num_annotators > 0 else 0
        }
    }


def main():
    parser = argparse.ArgumentParser(description='Compute IAA metrics from annotated HTML files')
    parser.add_argument('files', nargs='+', help='HTML files to analyze (2 or more)')
    parser.add_argument('--output', '-o', help='Output JSON file (default: stdout)')
    
    args = parser.parse_args()
    
    if len(args.files) < 2:
        print(json.dumps({
            "error": "At least 2 HTML files are required for IAA analysis"
        }), file=sys.stderr)
        sys.exit(1)
    
    # Parse all HTML files
    annotators_data = {}
    for html_file in args.files:
        if not Path(html_file).exists():
            print(json.dumps({
                "error": f"File not found: {html_file}"
            }), file=sys.stderr)
            sys.exit(1)
        
        labels = parse_html_labels(html_file)
        annotators_data[html_file] = labels
    
    # Calculate metrics
    results = calculate_iaa_metrics(annotators_data)
    
    # Output results
    output_json = json.dumps(results, indent=2, ensure_ascii=False)
    
    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output_json)
        print(f"Results written to {args.output}")
    else:
        # Force UTF-8 encoding for stdout to handle Unicode characters on Windows
        import sys
        if sys.platform == 'win32':
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        print(output_json)


if __name__ == "__main__":
    main()
