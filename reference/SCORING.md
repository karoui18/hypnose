# Questionnaire source and scoring notes

All rules are from the local PDFs listed in `content/downloads.json`. The text extraction is retained in `reference/questionnaires/`. Question and option order was checked against the documents; ASRS shaded cells and the values choices were also inspected visually in the PDF. No questionnaire results are sent to or stored by the site.

Indexes below are one-based. Missing answers are rejected; no imputation or default-zero scoring is used.

| Instrument | Calculation | PDF interpretation |
| --- | --- | --- |
| Hamilton | Sum 14 items, 0–4; total 0–56 | 0–7 minimal/absent; 8–14 mild; 15–23 moderate; 24–56 severe. Separate source note: significant-anxiety threshold 20. Item 14 is an interview observation. |
| Attitudes | Sum 12 items, 1–5; total 12–60 | Higher = more negative orientation. Indicative norm 25, not a diagnostic cutoff; no invented score bands. |
| LSAS | 24 anxiety scores + 24 avoidance scores, each 0–3; total 0–144 | 56–65 moderate; 66–80 marked; 81–95 severe; 96–144 very severe. No category is supplied below 56. |
| ASRS | Count shaded Part-A answers, 0–6 | At least 4 indicates further assessment; below 4 does not rule out ADHD. Part B is descriptive only. |
| Rosenberg | 10 items, 1–4; reverse 3,5,8,9,10 using `5 − response`; total 10–40 | 10–24 very low; 25–30 low; 31–34 average; 35–39 high; 40 very high. |
| Social self-esteem | 30 items, 1–6; reverse 1,2,9,10,11,14,16,18,19,20,21,23,26,29,30 using `7 − response`; total 30–180 | Higher = better self-esteem. Reference-group means are not diagnostic cutoffs. |
| TAS-20 | 20 items, 1–5; reverse 4,5,10,18,19 using `6 − response`; total 20–100 | 20–51 absence; 52–60 possible; 61–100 present, expressed as source-barème zones rather than a diagnosis. |
| PSS-10 | 10 items, 0–4; reverse 4,5,7,8 using `4 − response`; total 0–40 | 0–13 low; 14–26 moderate; 27–40 high. Period: past month. |
| Horn | Six separate triads, each 3–15 | Strictly greater than 10 highlights a smoking motivation. No interpreted global total. |
| Beck abbreviated | 13 groups A–M, each 0–3; take the **maximum of all selected statements** in each group, then sum 0–39 | 0–3 absent; 4–7 mild; 8–15 medium/moderate; 16–39 severe, framed as source zones. Multiple selections per group are permitted. |
| Values target | Rank six different values and place them visually | No numerical score or cutoff exists in the PDF. Internal slider coordinates are display positions only. |

## Detailed subscales

- ASRS response encoding: never=0, rarely=1, sometimes=2, often=3, very often=4. Shaded lower bounds for items 1–18: `[2,2,2,3,3,3,3,3,2,3,3,2,3,3,3,2,3,2]`. The interface preserves these shaded options. Reference period: six months.
- LSAS performance items: 1,2,3,4,6,8,9,13,14,16,17,20. Social interaction: 5,7,10,11,12,15,18,19,21,22,23,24. Separate anxiety and avoidance subscores yield four totals of 0–36.
- TAS-20, after reversal: identifying emotions = 1+3+6+7+9+13+14 (7–35); describing emotions = 2+4+11+12+17 (5–25); externally oriented thought = 5+8+10+15+16+18+19+20 (8–40). The factors have different denominators; no automatic ranking or normalized severity is invented.
- Horn: stimulation A+G+M; gesture pleasure B+H+N; relaxation C+I+O; anxiety/support D+J+P; absolute need E+K+Q; acquired habit F+L+R.

## Source exceptions and transcription corrections

- Rosenberg's reversal sentence repeats answer 1 and omits answer 4. The complete mathematical reversal `1↔4, 2↔3` is applied and disclosed in the user-facing method. The source's item order is retained. See the [University of Maryland's Rosenberg scale information](https://socy.umd.edu/about-us/using-rosenberg-self-esteem-scale) for the original instrument; the local PDF's 1–4 convention and interpretation bands remain the implementation source.
- The LSAS table calls performance avoidance “A.P” a second time. The interface uses an unambiguous descriptive name. The introduction mixes self- and clinician-assessment terminology and mentions clinical experience; the UI preserves the need for professional interpretation.
- Horn's explanatory paragraph says “Simulation” where its scoring heading says “Stimulation”; the heading is used. No missing explanation for the acquired-habit factor has been invented.
- PDF extraction introduced spaces inside words. These were joined; obvious typographic mistakes were corrected without changing item meaning. Beck item L3 repeats a work-related statement in the source; it is deliberately retained, not replaced with another version of Beck.
- The ASRS scoring method follows the local shaded-box version, not alternative continuous scoring methods. [Harvard's instrument page](https://www.hcp.med.harvard.edu/ncs/asrs.php) was consulted to cross-check the importance of preserving response options, shading and scoring.
- Questionnaire classifications are descriptions of the PDF barème, not clinical diagnoses. Beck group G can display a brief supportive message when a nonzero statement is selected; this does not alter the score.

## Assets and dependencies

QR encoder: [Kazuhiko Arase's qrcode-generator](https://github.com/kazuhikoarase/qrcode-generator), vendored in `js/vendor/` with its MIT license. Independent test decoder: [jsQR](https://github.com/cozmo/jsQR), in `scripts/vendor/`, MIT. QR encoding runs locally; no external QR service is used. Codes contain the questionnaire URL only, never a password, response or result.

The original PDFs and instruments retain their original ownership and notices. The implementation and its tests do not constitute clinical validation of the instruments or independent verification of their French norms.
