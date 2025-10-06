# HTML Labelizer

**A powerful web-based tool for semantic annotation of HTML documents with hierarchical labels, advanced pattern matching, and coreference resolution.**

👉 **[Use it now - No installation required](https://zachariegarniercuchet.github.io/HTMLLabelizer/)**

---

## 🚀 Quick Start

1. **Open the app** at [https://zachariegarniercuchet.github.io/HTMLLabelizer/](https://zachariegarniercuchet.github.io/HTMLLabelizer/)
2. **Upload your HTML file** (drag-and-drop or click to browse)
3. **Create your label schema** or continue from a previously labeled file
4. **Select text and apply labels** using the context menu
5. **Download your annotated HTML** with embedded schema

Everything runs locally in your browser — no data leaves your machine.

---

## ✨ Key Features

### 📋 Hierarchical Labeling
Create nested label structures (up to 2 levels deep) with color-coding and custom attributes:
- **String attributes** for free-text values
- **Dropdown attributes** for controlled vocabularies
- **Checkbox attributes** for boolean flags

### 🔍 Advanced Pattern-Based Labeling
Search for complex text patterns and apply structured labels in bulk:
- Find all occurrences of a pattern in your document
- Navigate between matches with Previous/Next
- Apply labels to single matches or all at once
- Preserve nested label structures across applications

### 🔗 Group Management & Coreference Resolution
Link related label instances together with synchronized attributes:
- **Group ID**: Unique identifier linking related annotations
- **Group Attributes**: Shared properties that sync across all group members
- **Active Groups Panel**: View and manage all coreferences in real-time

---

## 📖 Usage Examples

### Example 1: Basic Legal Citation Labeling

**Text in document:**
```
See Theratechnologies inc. v. 121851 Canada inc., 2015 SCC 18, [2015] 2 S.C.R. 106
```

**After labeling:**
```html
<manual_label labelname="mention" docid="scc2015-18" doctype="decision" url="https://www.canlii.org/en/ca/scc/doc/2015/2015scc18/2015scc18.html">
  <manual_label labelname="title" titletype="case name">
    Theratechnologies inc. v. 121851 Canada inc.
  </manual_label>, 
  <manual_label labelname="reference">
    2015 SCC 18, [2015] 2 S.C.R. 106
  </manual_label>
</manual_label>
```

### Example 2: Advanced Pattern Labeling

**Goal:** Label all references to "s.117 of the IRPA" throughout your document.

**Steps:**
1. In the **Advanced Labelization** panel, type or paste: `s.117 of the IRPA` and it will automatically search all occurences in the document
2. Select the entire text and apply the **mention** label with `docid="irpa"`
3. Select `s.117` and apply the **fragment** label with attributes `fragmentid="117"` and `fragmenttype="section (rule)"`
4. Select `IRPA` and apply the **title** label with attribute `titletype="acronym"`
5. Click **Apply All** to label every occurrence automatically, or use **Previous/Next** to review and **Apply** individually

**Result:** Every instance of "s.117 of the IRPA" becomes:
```html
<manual_label labelname="mention" docid="irpa" doctype="legislation" url="https://www.canlii.org/en/ca/laws/stat/sc-2001-c-27/latest/sc-2001-c-27.html">
  <manual_label labelname="fragment" fragmentid="117" fragmenttype="section (rule)">
    s.117
  </manual_label> of the 
  <manual_label labelname="title" titletype="acronym">
    IRPA
  </manual_label>
</manual_label>
```

### Example 3: Coreference Resolution with Groups

**Scenario:** The task is to labelize references to legal document and the same legal document is referenced multiple ways throughout your text:
- "Immigration and Refugee Protection Act"
- "IRPA"
- "the Act"

**Solution:** Use the same `docid` (Group ID) for all instances:

```html
<!-- First mention -->
<manual_label labelname="mention" docid="irpa" doctype="legislation" url="https://www.canlii.org/en/ca/laws/stat/sc-2001-c-27/latest/sc-2001-c-27.html">
  <manual_label labelname="title" titletype="long title">
    Immigration and Refugee Protection Act
  </manual_label>
</manual_label>

<!-- Second mention -->
<manual_label labelname="mention" docid="irpa" doctype="legislation" url="https://www.canlii.org/en/ca/laws/stat/sc-2001-c-27/latest/sc-2001-c-27.html">
  <manual_label labelname="title" titletype="acronym">
    IRPA
  </manual_label>
</manual_label>

<!-- Third mention -->
<manual_label labelname="mention" docid="irpa" doctype="legislation" url="https://www.canlii.org/en/ca/laws/stat/sc-2001-c-27/latest/sc-2001-c-27.html">
  <manual_label labelname="title" titletype="alias ad hoc">
    the Act
  </manual_label>
</manual_label>
```

**Key benefit:** When you edit the `doctype` or `url` (Group Attributes) for any instance, all three update automatically because they share the same `docid`.

---

## 🏗️ Label Schema Configuration

Your label schema is saved directly in your HTML file as a comment. Here's an example configuration:

```html
<!-- HTMLLabelizer
{
  "mention": {
    "color": "#6aa3ff",
    "sublabels": {
      "title": {
        "color": "#20c997",
        "sublabels": {},
        "attributes": {
          "titletype": {
            "type": "dropdown",
            "options": ["long title", "case name", "acronym", "alias ad hoc"],
            "default": "long title",
            "groupRole": "regular"
          }
        }
      },
      "reference": {
        "color": "#dc3545",
        "sublabels": {},
        "attributes": {}
      },
      "fragment": {
        "color": "#6f42c1",
        "sublabels": {},
        "attributes": {
          "fragmentid": {
            "type": "string",
            "default": "",
            "groupRole": "regular"
          },
          "fragmenttype": {
            "type": "dropdown",
            "options": ["section (rule)", "subsection (rule)", "page", "paragraph"],
            "default": "section (rule)",
            "groupRole": "regular"
          }
        }
      }
    },
    "attributes": {
      "docid": {
        "type": "string",
        "default": "",
        "groupRole": "groupID"
      },
      "doctype": {
        "type": "dropdown",
        "options": ["decision", "legislation"],
        "default": "decision",
        "groupRole": "groupAttribute"
      },
      "url": {
        "type": "string",
        "default": "",
        "groupRole": "groupAttribute"
      }
    }
  }
}
-->
```

### Understanding `groupRole`:
- **`groupID`**: The attribute that identifies which group an instance belongs to (e.g., `docid`)
- **`groupAttribute`**: Attributes synchronized across all instances with the same Group ID (e.g., `doctype`, `url`)
- **`regular`**: Instance-specific attributes that don't sync across the group (e.g., `titletype`, `fragmentid`)

---

## 🎯 Advanced Workflows

### Multi-Selection Labeling
1. Hold **Ctrl** while selecting multiple text ranges
2. Apply a label to all selections simultaneously
3. Perfect for labeling similar elements throughout your document

### Session Continuity
- Upload a previously labeled HTML file to continue where you left off
- The schema is automatically detected from the `<!-- HTMLLabelizer ... -->` comment
- All existing labels remain intact and editable

### Group Management Panel
- Click on any active group to highlight all related instances
- Edit group attributes once to update all members
- Monitor group consistency and relationships in real-time

---

## 💻 Local Development

```bash
git clone https://github.com/zachariegarniercuchet/HTMLLabelizer.git
cd HTMLLabelizer
```

Open `index.html` in your browser — no server required!

---

## 📖 Citation

If you use HTML Labelizer in your research, please cite:

```bibtex
@misc{htmllabelizer2025,
  author       = {Zacharie Garnier-Cuchet},
  title        = {HTML Labelizer: A lightweight web-based tool for structured HTML annotation},
  year         = {2025},
  howpublished = {\url{https://zachariegarniercuchet.github.io/HTMLLabelizer/}},
}
```

---

## 📝 License

MIT License — free to use and improve.

---

## 🆘 Support

For questions or issues, please visit the [GitHub repository](https://github.com/zachariegarniercuchet/HTMLLabelizer) or open an issue.