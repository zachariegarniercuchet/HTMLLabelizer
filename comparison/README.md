# IAA Analysis Setup

## Installation

1. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

2. **Make sure Node.js server is running:**
   ```bash
   node ../server.js
   ```

## Usage

1. **Load 2+ annotated HTML files** in the comparison tool (Document A and Document B)
2. **Click "IAA Analysis"** button in the header
3. The system will:
   - Send HTML content to the Python backend (`/api/iaa`)
   - Python runs both IAA analysis and label matching
   - Computes IAA metrics (label counts, overlaps, Jaccard similarity)
   - Returns JSON results
4. **View results** in the modal popup with:
   - Summary statistics
   - Label usage per annotator
   - Overlap analysis
   - Jaccard similarity scores
   - **Label matching statistics**
5. **See visual highlighting** in the documents:
   - 🟢 **Green outline**: Exact match (100%)
   - 🟡 **Yellow outline**: Partial match (≥50%)
   - 🔴 **Red outline**: No match (<50%)
6. **Hover over labels** to see match details (score, matched text, label name)

## Architecture

```
Browser (JS)  →  POST /api/iaa  →  Node.js  →  Python Scripts  →  JSON Response
                    (HTML content)           (iaa_analysis.py + label_matcher.py)
                                                        ↓
                                            Returns: { iaa: {...}, label_matches: {...} }
```

## Label Matching Features

### Token-Based Matching
- Extracts `<manual_label>` and `<auto_label>` tags
- Handles nested HTML (`<b>`, `<i>` tags automatically flattened)
- Normalizes tokens (lowercase, whitespace)
- Compares using Jaccard similarity

### Match Types
- **Exact**: Same tokens in same order (100% match)
- **Partial**: ≥50% token overlap
- **None**: <50% overlap

### Visual Highlighting
Labels are automatically highlighted in both document views:
```css
.iaa-exact-match   → Green outline + shadow
.iaa-partial-match → Yellow outline + shadow  
.iaa-no-match      → Red outline + shadow
```

### Hover Tooltips
Shows match information:
```
Match: 85% (partial)
Matched with: citation
Text: "Smith v. Jones..."
```

## Example Output

### IAA Analysis
```json
{
  "summary": {
    "num_annotators": 2,
    "annotators": ["test1", "test2"],
    "total_unique_labels": 5,
    "unique_label_types": ["citation", "date", "judge", "parties"]
  },
  "label_counts": {
    "test1": {"citation": 10, "date": 3},
    "test2": {"citation": 8, "date": 5}
  },
  "overlap_analysis": {
    "test1_vs_test2": {
      "common_labels": 3,
      "total_unique_labels": 5,
      "jaccard_similarity": 0.6
    }
  }
}
```

### Label Matching
```json
{
  "summary": {
    "exact_matches": 850,
    "partial_matches": 42,
    "no_matches": 13,
    "exact_match_rate": 0.94
  },
  "matches": [
    {
      "document": "test1",
      "labels": {
        "label_0": {
          "label_info": {"name": "citation", "text": "Smith v. Jones"},
          "matches": {
            "test2": {
              "label_id": "label_0",
              "match_type": "exact",
              "overlap": 1.0,
              "text": "Smith v. Jones"
            }
          }
        }
      }
    }
  ]
}
```

## Extending the Analysis

### Add More IAA Metrics
Modify [iaa_analysis.py](iaa_analysis.py) to add:
- Cohen's Kappa
- Fleiss' Kappa  
- F1 scores
- Confusion matrices

Required libraries: `scikit-learn`, `statsmodels`

### Customize Match Thresholds
Change minimum overlap in the request:
```javascript
body: JSON.stringify({
  files: [...],
  minOverlap: 0.7  // 70% minimum overlap
})
```

### Use Real Tokenization
Replace `tokenize_simple()` in [label_matcher.py](label_matcher.py) with your actual tokenizer from `main_demo.ipynb`:
```python
from utils import tokenize, clean_tokens

def extract_labels_with_tokens(html_file: str):
    # Use your actual tokenization pipeline
    body_content = extract_body(html_content)
    tokens = tokenize(body_content)
    normalized_tokens = clean_tokens(
        html_tokens=tokens, 
        normalize=True, 
        keep_manual_label=True
    )
    # ... rest of the code
```

