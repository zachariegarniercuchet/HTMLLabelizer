# HTML Labelizer

The **HTML Labelizer** is a lightweight web-based application that allows you to annotate HTML files with structured labels and attributes.  
It is designed for text labeling tasks where you want to add semantic information directly into the HTML file.

---

## ✨ Features

* **Upload & Continue**
  * Load an HTML file into the application.
  * If the uploaded file contains a special `<!-- HTMLLabelizer ... -->` comment (before `<head>`), the app will automatically parse it and rebuild the label tree in the sidebar.
  * If no such comment exists, you can set up the label tree manually.

* **Label Management**
  * Create **labels** and **sublabels** from the right-hand menu.
  * Define attributes (e.g., `docid`, `doctype`) for each label or sublabel.
  * Hierarchical structure for labels (tree-like):

    ```
    mention (attributes: docid, doctype)
    ├── title
    ├── reference
    ├── fragment (attributes: fragmenttype, fragmentid)
    └── other
    ```

* **Text Selection & Labeling**
  * Select text in the uploaded HTML file with your mouse.
  * Apply a label or sublabel to the selected text.
  * Click on an applied label to edit its attributes.

* **Download Progress**
  * Save your work regularly by downloading the updated HTML file.
  * When downloading, the app updates or inserts the `<!-- HTMLLabelizer ... -->` JSON comment so that you can reload the same label structure later.
  * Prevents accidental data loss.

---

## 🖼️ Example

### HTML with Labels Applied

```html
<manual_label labelname="mention" parent="" doctype="decision" docid="Thera" style="background-color: rgb(251, 60, 60); color: white;">
  <manual_label labelname="title" parent="mention" style="background-color: rgb(111, 66, 193); color: white;">
    Theratechnologies inc. v. 121851 Canada inc.
  </manual_label>, 
  <manual_label labelname="reference" parent="mention" style="background-color: rgb(74, 158, 255); color: black;">
    2015 SCC 18, [2015] 2 S.C.R. 106
  </manual_label>
</manual_label>
```

### HTML with `HTMLLabelizer` Comment

```html
<!DOCTYPE html>
<html><!-- other comments-->
<!-- HTMLLabelizer
{
  "mention": {
    "color": "#dc3545",
    "sublabels": {
      "title": {
        "color": "#20c997",
        "sublabels": {},
        "attributes": {}
      },
      "reference": {
        "color": "#6f42c1",
        "sublabels": {},
        "attributes": {}
      },
      "fragment": {
        "color": "#6aa3ff",
        "sublabels": {},
        "attributes": {
          "fragmentid": {
            "type": "string",
            "default": ""
          },
          "fragmenttype": {
            "type": "dropdown",
            "options": [
              "sec",
              "art"
            ],
            "default": "sec"
          }
        }
      }
    },
    "attributes": {
      "docid": {
        "type": "string",
        "default": ""
      },
      "doctype": {
        "type": "dropdown",
        "options": [
          "decision",
          "legislation"
        ],
        "default": "decision"
      }
    }
  }
}
--><head>
```

---

## ⚠️ Current Limitations

This is an early version of the app. Some known issues:

* **Formatting bugs**: Applying labels over italicized text may break formatting.

---

## 🚀 Future Improvements

Planned enhancements:

* More user-friendly attribute editor (set attributes while labeling).
* Fix italic text handling.

---

## 💻 How to Use

You don’t need to install anything — just open the web app in your browser:

👉 [HTML Labelizer](https://zachgarnier.github.io/HTMLLabelizer/)

1. Upload your HTML file.
2. If an `HTMLLabelizer` comment is found, the label tree will be reconstructed automatically.
3. Use the right-hand menu to add **labels** and **sublabels**.
4. Select text with your mouse and apply labels.
5. Click on applied labels to edit attributes.
6. Download your updated HTML regularly to avoid losing progress.

You can also reload a previously labeled HTML file to continue your work.

---

## 📂 Installation & Run

1. Clone the repository:

   ```bash
   git clone https://github.com/your-username/html-labelizer.git
   cd html-labelizer
   ```
2. Open `index.html` in your browser.
   No server required — it’s a client-side application.

---

## 📖 Cite Us

If you use **HTML Labelizer** in your research or project, please cite it as:

> Zacharie Garnier-Cuchet. *HTML Labelizer: A lightweight web-based tool for structured HTML annotation.* GitHub, 2025.
> [https://zachgarnier.github.io/HTMLLabelizer/](https://zachgarnier.github.io/HTMLLabelizer/)

You may also reference the GitHub repository:

```bibtex
@misc{htmllabelizer2025,
  author       = {Zacharie Garnier-Cuchet},
  title        = {HTML Labelizer: A lightweight web-based tool for structured HTML annotation},
  year         = {2025},
  howpublished = {\url{https://zachgarnier.github.io/HTMLLabelizer/}},
}
```

---

## 📝 License

MIT License. Free to use and improve.


