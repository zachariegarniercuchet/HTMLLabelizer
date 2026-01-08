#!/usr/bin/env python3
"""
Label Matching for IAA Analysis
Uses tokenization to find exact and overlap matches between labels across multiple documents
"""

import sys
import json
from pathlib import Path
from bs4 import BeautifulSoup
from typing import List, Dict, Tuple, Optional
import re


def tokenize_simple(html_content: str) -> List[str]:
    """
    Simple tokenization - splits on whitespace and common punctuation
    Similar to the tokenization used in main_demo.ipynb but simplified
    """
    # Remove HTML tags except manual_label and auto_label
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Simple word tokenization
    text = soup.get_text()
    tokens = re.findall(r'\b\w+\b|[^\w\s]', text)
    return tokens


def extract_labels_with_tokens(html_file: str) -> Dict:
    """
    Extract all labels with their normalized token positions
    Returns: {
        'labels': [
            {
                'id': 'label_0',
                'type': 'manual_label',
                'name': 'citation',
                'text': 'original text',
                'tokens': ['normalized', 'tokens'],
                'start_pos': 0,
                'end_pos': 5,
                'attributes': {...}
            },
            ...
        ],
        'filename': 'doc1',
        'full_tokens': [all tokens in document]
    }
    """
    # Try different encodings
    for encoding in ['utf-8', 'latin-1', 'cp1252', 'iso-8859-1']:
        try:
            with open(html_file, 'r', encoding=encoding) as f:
                html_content = f.read()
                break
        except UnicodeDecodeError:
            continue
    else:
        with open(html_file, 'r', encoding='utf-8', errors='ignore') as f:
            html_content = f.read()
    
    soup = BeautifulSoup(html_content, 'html.parser')
    
    # Extract all text with labels marked
    labels_data = []
    label_id = 0
    
    # Find all manual_label and auto_label tags
    for label_type in ['manual_label', 'auto_label']:
        for label_tag in soup.find_all(label_type):
            # Get the text content (this automatically flattens nested HTML like <b>, <i>)
            label_text = label_tag.get_text(strip=False)
            
            # Tokenize the label text
            label_tokens = tokenize_simple(label_text)
            
            # Normalize tokens (lowercase, strip)
            normalized_tokens = [t.lower().strip() for t in label_tokens if t.strip()]
            
            # Get attributes
            attrs = {k: v for k, v in label_tag.attrs.items() if k not in ['style']}
            label_name = attrs.get('name', attrs.get('labelName', ''))
            
            labels_data.append({
                'id': f'label_{label_id}',
                'type': label_type,
                'name': label_name,
                'text': label_text.strip(),
                'tokens': normalized_tokens,
                'token_count': len(normalized_tokens),
                'attributes': attrs
            })
            
            label_id += 1
    
    # Tokenize full document for context
    full_text = soup.get_text()
    full_tokens = tokenize_simple(full_text)
    normalized_full_tokens = [t.lower().strip() for t in full_tokens if t.strip()]
    
    return {
        'labels': labels_data,
        'filename': Path(html_file).stem,
        'full_tokens': normalized_full_tokens
    }


def calculate_token_overlap(tokens1: List[str], tokens2: List[str]) -> Dict:
    """
    Calculate overlap between two token lists
    Returns: {
        'exact_match': bool,
        'overlap_ratio': float (0-1),
        'common_tokens': int,
        'overlap_type': 'exact' | 'partial' | 'none'
    }
    """
    set1 = set(tokens1)
    set2 = set(tokens2)
    
    if not set1 or not set2:
        return {
            'exact_match': False,
            'overlap_ratio': 0.0,
            'common_tokens': 0,
            'overlap_type': 'none'
        }
    
    # Check exact match (same tokens in same order)
    exact_match = tokens1 == tokens2
    
    # Calculate Jaccard similarity
    intersection = len(set1 & set2)
    union = len(set1 | set2)
    overlap_ratio = intersection / union if union > 0 else 0.0
    
    # Determine overlap type
    if exact_match:
        overlap_type = 'exact'
    elif overlap_ratio >= 0.5:  # At least 50% overlap
        overlap_type = 'partial'
    else:
        overlap_type = 'none'
    
    return {
        'exact_match': exact_match,
        'overlap_ratio': round(overlap_ratio, 3),
        'common_tokens': intersection,
        'overlap_type': overlap_type
    }


def match_labels_across_documents(documents_data: List[Dict], min_overlap: float = 0.5) -> List[Dict]:
    """
    Match labels across multiple documents
    
    Args:
        documents_data: List of document data from extract_labels_with_tokens()
        min_overlap: Minimum overlap ratio to consider a match (default 0.5 = 50%)
    
    Returns: List of dictionaries, one per document, showing matches
    [
        {  # Doc 1
            'label_0': {
                'doc2': {'label_id': 'label_0', 'match_type': 'exact', 'overlap': 1.0},
                'doc3': {'label_id': None, 'match_type': 'none', 'overlap': 0.0}
            },
            'label_1': {...}
        },
        {  # Doc 2
            'label_0': {...}
        },
        ...
    ]
    """
    num_docs = len(documents_data)
    match_results = []
    
    for i, doc_data in enumerate(documents_data):
        doc_matches = {}
        
        for label in doc_data['labels']:
            label_id = label['id']
            label_tokens = label['tokens']
            
            # Compare with all other documents
            matches = {}
            for j, other_doc in enumerate(documents_data):
                if i == j:
                    continue  # Skip self-comparison
                
                other_doc_name = other_doc['filename']
                best_match = None
                best_overlap = 0.0
                
                # Find best matching label in other document
                for other_label in other_doc['labels']:
                    overlap_info = calculate_token_overlap(label_tokens, other_label['tokens'])
                    
                    if overlap_info['overlap_ratio'] >= min_overlap:
                        if overlap_info['overlap_ratio'] > best_overlap:
                            best_overlap = overlap_info['overlap_ratio']
                            best_match = {
                                'label_id': other_label['id'],
                                'match_type': overlap_info['overlap_type'],
                                'overlap': overlap_info['overlap_ratio'],
                                'label_name': other_label['name'],
                                'text': other_label['text'][:50] + '...' if len(other_label['text']) > 50 else other_label['text']
                            }
                
                # Store result (None if no match)
                matches[other_doc_name] = best_match
            
            doc_matches[label_id] = {
                'label_info': {
                    'name': label['name'],
                    'text': label['text'][:50] + '...' if len(label['text']) > 50 else label['text'],
                    'token_count': label['token_count']
                },
                'matches': matches
            }
        
        match_results.append({
            'document': doc_data['filename'],
            'labels': doc_matches
        })
    
    return match_results


def generate_match_summary(match_results: List[Dict]) -> Dict:
    """Generate summary statistics from match results"""
    total_labels = sum(len(doc['labels']) for doc in match_results)
    
    match_counts = {'exact': 0, 'partial': 0, 'none': 0}
    
    for doc in match_results:
        for label_id, label_data in doc['labels'].items():
            for other_doc, match_info in label_data['matches'].items():
                if match_info:
                    match_counts[match_info['match_type']] += 1
                else:
                    match_counts['none'] += 1
    
    total_comparisons = sum(match_counts.values())
    
    return {
        'total_labels': total_labels,
        'total_comparisons': total_comparisons,
        'exact_matches': match_counts['exact'],
        'partial_matches': match_counts['partial'],
        'no_matches': match_counts['none'],
        'exact_match_rate': round(match_counts['exact'] / total_comparisons, 3) if total_comparisons > 0 else 0,
        'partial_match_rate': round(match_counts['partial'] / total_comparisons, 3) if total_comparisons > 0 else 0
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Match labels across annotated HTML files')
    parser.add_argument('files', nargs='+', help='HTML files to analyze (2 or more)')
    parser.add_argument('--min-overlap', type=float, default=0.5, help='Minimum overlap ratio (0-1)')
    parser.add_argument('--output', '-o', help='Output JSON file (default: stdout)')
    parser.add_argument('--parallel', action='store_true', help='Use parallel token traversal algorithm (experimental)')
    args = parser.parse_args()

    if len(args.files) < 2:
        print(json.dumps({"error": "At least 2 HTML files are required"}), file=sys.stderr)
        sys.exit(1)

    if args.parallel:
        # Use the new parallel algorithm
        from comparison.label_matcher import load_and_clean_tokens, match_labels_parallel
        token_lists = [load_and_clean_tokens(f) for f in args.files]
        results = match_labels_parallel(token_lists, args.files, min_overlap=args.min_overlap)
        output = {'matches': results}
        output_json = json.dumps(output, indent=2, ensure_ascii=False)
    else:
        # Use the legacy approach
        documents_data = []
        for html_file in args.files:
            if not Path(html_file).exists():
                print(json.dumps({"error": f"File not found: {html_file}"}), file=sys.stderr)
                sys.exit(1)
            doc_data = extract_labels_with_tokens(html_file)
            documents_data.append(doc_data)
        match_results = match_labels_across_documents(documents_data, min_overlap=args.min_overlap)
        summary = generate_match_summary(match_results)
        output = {'summary': summary, 'matches': match_results}
        output_json = json.dumps(output, indent=2, ensure_ascii=False)

    if args.output:
        with open(args.output, 'w', encoding='utf-8') as f:
            f.write(output_json)
        print(f"Results written to {args.output}")
    else:
        import sys
        if sys.platform == 'win32':
            import codecs
            sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
        print(output_json)


if __name__ == "__main__":
    main()
