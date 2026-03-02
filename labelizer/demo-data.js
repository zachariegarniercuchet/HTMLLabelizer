// Demo data for HTML Labelizer
// This file contains sample HTML content and label schema for demonstration purposes

const DEMO_DATA = {
  // Sample HTML with embedded label schema and applied labels
  html: `
<!DOCTYPE html>
<html lang="en">
<!-- HTMLLabelizer
{
  "labeltree": {

    "movie": {
      "color": "#E91E63",

      "sublabels": {
        "person": {
          "color": "#EC407A",
          "sublabels": {},
          "attributes": {
            "role": {
              "type": "dropdown",
              "options": ["Director", "Actor", "Producer", "Writer", "Composer"],
              "default": "Actor",
              "groupRole": "regular"
            }
          }
        },

        "title": {
          "color": "#F06292",
          "sublabels": {},
          "attributes": {
            "official": {
              "type": "checkbox",
              "default": true,
              "groupRole": "regular"
            }
          }
        }
      },

      "attributes": {
        "id": {
          "type": "string",
          "default": "",
          "groupRole": "groupID"
        },

        "format": {
          "type": "dropdown",
          "options": [
            "Short film",
            "Feature film",
            "Medium-length film",
            "Documentary"
          ],
          "default": "Feature film",
          "groupRole": "groupAttribute"
        },

        "genre": {
          "type": "dropdown",
          "options": [
            "Drama",
            "Comedy",
            "Suspense",
            "Thriller",
            "Science-fiction",
            "Horror",
            "Romance",
            "Action",
            "Adventure"
          ],
          "default": "Drama",
          "groupRole": "groupAttribute"
        },

        "date": {
          "type": "string",
          "default": "",
          "groupRole": "groupAttribute"
        }
      }
    },


    "serie": {
      "color": "#9C27B0",

      "sublabels": {
        "person": {
          "color": "#CE93D8",
          "sublabels": {},
          "attributes": {
            "role": {
              "type": "dropdown",
              "options": ["Director", "Actor", "Producer", "Writer", "Showrunner"],
              "default": "Actor",
              "groupRole": "regular"
            }
          }
        },

        "episode": {
          "color": "#AB47BC",
          "sublabels": {},
          "attributes": {
            "number": {
              "type": "string",
              "default": "",
              "groupRole": "regular"
            },
            "season": {
              "type": "string",
              "default": "",
              "groupRole": "regular"
            }
          }
        },

        "title": {
          "color": "#BA68C8",
          "sublabels": {},
          "attributes": {
            "official": {
              "type": "checkbox",
              "default": true,
              "groupRole": "regular"
            }
          }
        }
      },

      "attributes": {
        "id": {
          "type": "string",
          "default": "",
          "groupRole": "groupID"
        },

        "genre": {
          "type": "dropdown",
          "options": [
            "Suspense",
            "Drama",
            "Comedy",
            "Thriller",
            "Science-fiction",
            "Crime",
            "Fantasy"
          ],
          "default": "Drama",
          "groupRole": "groupAttribute"
        },

        "date": {
          "type": "string",
          "default": "",
          "groupRole": "groupAttribute"
        }
      }
    },

    "award": {
      "color": "#FF9800",
      "sublabels": {},
      "attributes": {
        "category": {
          "type": "dropdown",
          "options": ["Best Film", "Best Director", "Best Actor", "Best Actress", "Best Screenplay", "Jury Prize", "Audience Award"],
          "default": "Best Film",
          "groupRole": "regular"
        },
        "result": {
          "type": "dropdown",
          "options": ["Winner", "Nominee", "Honorable Mention"],
          "default": "Winner",
          "groupRole": "regular"
        }
      }
    },

    "sentiment": {
      "color": "#2196F3",
      "sublabels": {},
      "attributes": {
        "polarity": {
          "type": "dropdown",
          "options": ["positive", "negative", "neutral", "mixed"],
          "default": "neutral",
          "groupRole": "regular"
        },
        "intensity": {
          "type": "dropdown",
          "options": ["strong", "moderate", "weak"],
          "default": "moderate",
          "groupRole": "regular"
        }
      }
    }

  },

  "meta": {
    "project_title": "Demo Annotation",
    "annotator": "demo_user",
    "annotation_date": "2026-03-02",
    "time": 2389316
  }
}
-->
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Cannes Film Festival 2024 - Closing Ceremony Report</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.7;
      max-width: 900px;
      margin: 40px auto;
      padding: 30px;
      background: #f8f9fa;
      color: #2c3e50;
    }
    h1 {
      color: #c0392b;
      border-bottom: 4px solid #e74c3c;
      padding-bottom: 12px;
      font-size: 2.2em;
      margin-bottom: 10px;
    }
    h2 {
      color: #8e44ad;
      margin-top: 35px;
      font-size: 1.6em;
      border-left: 4px solid #9b59b6;
      padding-left: 15px;
    }
    .meta {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .meta p {
      margin: 8px 0;
      font-weight: 500;
    }
    p {
      margin: 18px 0;
      text-align: justify;
    }
    .quote {
      border-left: 4px solid #3498db;
      padding-left: 20px;
      margin: 25px 0;
      font-style: italic;
      color: #555;
    }
    .signature {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 2px solid #ecf0f1;
      font-style: italic;
      color: #95a5a6;
    }
  </style>
</head>
<body>
  <h1>77th Cannes Film Festival - Closing Ceremony Report</h1>
  
  <div class="meta">
    <p><strong>Event:</strong> Palme d'Or Award Ceremony</p>
    <p><strong>Date:</strong> May 27, 2024</p>
    <p><strong>Location:</strong> Grand Théâtre Lumière, Cannes, France</p>
    <p><strong>Report by:</strong> Festival Documentation Team</p>
  </div>

  <h2>Opening Remarks</h2>
  <p>
    The <manual_label labelname="award" parent="" category="Best Film" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">77th Cannes Film Festival</manual_label> concluded with a spectacular closing ceremony, celebrating exceptional cinematic achievements from around the world. Thierry Frémaux welcomed the international jury and attendees to the prestigious event.
  </p>

  <h2>Palme d'Or Winner</h2>
  <p>
    The coveted <manual_label labelname="award" parent="" category="Best Film" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">Palme d'Or</manual_label> was awarded to <manual_label labelname="movie" parent="" id="M2024-001" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">Anora</manual_label></manual_label>, directed by <manual_label labelname="movie" parent="" id="M2024-001" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Sean Baker</manual_label></manual_label>. This <manual_label labelname="sentiment" parent="" polarity="positive" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">powerful</manual_label> examination of modern relationships captivated both critics and audiences throughout the festival.
  </p>

  <div class="quote">
    <p>"<manual_label labelname="movie" parent="" id="M2024-001" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Baker</manual_label></manual_label>'s <manual_label labelname="movie" parent="" id="M2024-001" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">Anora</manual_label></manual_label> represents cinema at its finest - <manual_label labelname="sentiment" parent="" polarity="positive" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">bold, uncompromising, and deeply human</manual_label>," remarked Greta Gerwig, jury president.</p>
  </div>

  <h2>Grand Prix</h2>
  <p>
    The <manual_label labelname="award" parent="" category="Jury Prize" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">Grand Prix</manual_label> went to <manual_label labelname="movie" parent="" id="M2024-002" format="Feature film" genre="Thriller" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">All We Imagine as Light</manual_label></manual_label> by <manual_label labelname="movie" parent="" id="M2024-002" format="Feature film" genre="Thriller" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Payal Kapadia</manual_label></manual_label>, an <manual_label labelname="sentiment" parent="" polarity="positive" intensity="moderate" style="background-color: rgb(33, 150, 243); color: white;" verified="false">atmospheric</manual_label> exploration of urban loneliness in contemporary Mumbai.
  </p>

  <h2>Best Director</h2>
  <p>
    <manual_label labelname="movie" parent="" id="M2024-003" format="Feature film" genre="Science-fiction" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Francis Ford Coppola</manual_label></manual_label> received the <manual_label labelname="award" parent="" category="Best Director" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">Best Director award</manual_label> for <manual_label labelname="movie" parent="" id="M2024-003" format="Feature film" genre="Science-fiction" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">Megalopolis</manual_label></manual_label>, his <manual_label labelname="sentiment" parent="" polarity="mixed" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">ambitious and polarizing</manual_label> passion project decades in the making. At 85, Coppola proved his visionary approach to filmmaking remains undiminished.
  </p>

  <h2>Acting Awards</h2>
  <p>
    The <manual_label labelname="award" parent="" category="Best Actor" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">Best Actor prize</manual_label> was shared by <manual_label labelname="movie" parent="" id="M2024-004" format="Feature film" genre="Suspense" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Actor" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Jesse Plemons</manual_label></manual_label> for his <manual_label labelname="sentiment" parent="" polarity="positive" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">haunting</manual_label> performance in <manual_label labelname="movie" parent="" id="M2024-004" format="Feature film" genre="Suspense" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">Kinds of Kindness</manual_label></manual_label>, directed by <manual_label labelname="movie" parent="" id="M2024-004" format="Feature film" genre="Suspense" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Yorgos Lanthimos</manual_label></manual_label>.
  </p>

  <p>
    <manual_label labelname="movie" parent="" id="M2024-005" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Actor" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Selena Gomez</manual_label></manual_label> earned the <manual_label labelname="award" parent="" category="Best Actress" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">Best Actress award</manual_label> for her <manual_label labelname="sentiment" parent="" polarity="positive" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">transformative</manual_label> role in <manual_label labelname="movie" parent="" id="M2024-005" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">Emilia Pérez</manual_label></manual_label>, a musical drama by <manual_label labelname="movie" parent="" id="M2024-005" format="Feature film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Jacques Audiard</manual_label></manual_label>.
  </p>

  <h2>Short Film Recognition</h2>
  <p>
    In the short film category, <manual_label labelname="movie" parent="" id="M2024-006" format="Short film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="title" parent="movie" official="true" style="background-color: rgb(240, 98, 146); color: black;" verified="false">The Man Who Could Not Remain Silent</manual_label></manual_label> by <manual_label labelname="movie" parent="" id="M2024-006" format="Short film" genre="Drama" date="2024" style="background-color: rgb(233, 30, 99); color: white;" verified="false"><manual_label labelname="person" parent="movie" role="Director" style="background-color: rgb(236, 64, 122); color: white;" verified="false">Nebojša Slijepčević</manual_label></manual_label> won the <manual_label labelname="award" parent="" category="Best Film" result="Winner" style="background-color: rgb(255, 152, 0); color: black;" verified="false">Palme d'Or for Best Short Film</manual_label>, a <manual_label labelname="sentiment" parent="" polarity="positive" intensity="moderate" style="background-color: rgb(33, 150, 243); color: white;" verified="false">compelling</manual_label> 20-minute meditation on moral courage.
  </p>

  <h2>Special Mentions - Series Category</h2>
  <p>
    While not part of the official competition, the festival's series sidebar featured a <manual_label labelname="sentiment" parent="" polarity="positive" intensity="moderate" style="background-color: rgb(33, 150, 243); color: white;" verified="false">notable</manual_label> screening of <manual_label labelname="serie" parent="" id="S2024-001" genre="Thriller" date="2024" style="background-color: rgb(156, 39, 176); color: white;" verified="false"><manual_label labelname="title" parent="serie" official="true" style="background-color: rgb(186, 104, 200); color: black;" verified="false">The Bureau</manual_label></manual_label>, with <manual_label labelname="serie" parent="" id="S2024-001" genre="Thriller" date="2024" style="background-color: rgb(156, 39, 176); color: white;" verified="false"><manual_label labelname="episode" parent="serie" number="1" season="6" style="background-color: rgb(171, 71, 188); color: white;" verified="false">the final season premiere</manual_label></manual_label> drawing <manual_label labelname="sentiment" parent="" polarity="positive" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">enthusiastic</manual_label> responses from attendees.
  </p>

  <p>
    <manual_label labelname="serie" parent="" id="S2024-001" genre="Thriller" date="2024" style="background-color: rgb(156, 39, 176); color: white;" verified="false"><manual_label labelname="person" parent="serie" role="Director" style="background-color: rgb(206, 147, 216); color: black;" verified="false">Eric Rochant</manual_label></manual_label>, creator of <manual_label labelname="serie" parent="" id="S2024-001" genre="Thriller" date="2024" style="background-color: rgb(156, 39, 176); color: white;" verified="false"><manual_label labelname="title" parent="serie" official="true" style="background-color: rgb(186, 104, 200); color: black;" verified="false">The Bureau</manual_label></manual_label>, discussed the evolution of prestige television and its relationship to cinema. The <manual_label labelname="serie" parent="" id="S2024-002" genre="Science-fiction" date="2024" style="background-color: rgb(156, 39, 176); color: white;" verified="false"><manual_label labelname="title" parent="serie" official="false" style="background-color: rgb(186, 104, 200); color: black;" verified="false">Fallout</manual_label></manual_label> limited series also generated <manual_label labelname="sentiment" parent="" polarity="positive" intensity="moderate" style="background-color: rgb(33, 150, 243); color: white;" verified="false">considerable buzz</manual_label> among industry professionals.
  </p>

  <h2>Closing Thoughts</h2>
  <p>
    Frémaux closed the ceremony by emphasizing cinema's enduring power to unite global audiences. The festival showcased <manual_label labelname="sentiment" parent="" polarity="positive" intensity="strong" style="background-color: rgb(33, 150, 243); color: white;" verified="false">remarkable</manual_label> diversity in storytelling, from intimate character studies to sweeping epics, proving that the art form continues to evolve and inspire.
  </p>

  <div class="signature">
    <p>Report compiled by: Festival Documentation Team</p>
    <p>Cannes Film Festival - May 2024</p>
    <p>© Festival de Cannes</p>
  </div>
</body>
</html>`,

  fileName: 'cannes-festival-2024-report.html',
  
  // Metadata for the demo
  metadata: {
    project_title: 'Demo Annotation',
    annotator: 'demo_user',
    annotation_date: '2026-03-02',
    time: 0
  }
};
