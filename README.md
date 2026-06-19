# My Personal Finance Tracker

Purely vibe coded personal finance tracker. Honestly just didnt want to have to pay a website to do this for me. 

## What it does

- Upload one or more credit card or debit statement PDFs
- Save parsed statement data locally in your browser
- Archive original uploaded PDFs into `storage/YYYY-MM/` inside the repo
- Save parsed monthly metadata into `storage/YYYY-MM/index.json`
- Keep adding monthly statements so the dashboard tallies everything together
- Multi-select transactions and bulk-assign a category
- Extracts text in the browser with `pdf.js`
- Breaks statements into:
  - account info
  - statement period
  - opening and closing balances
  - money in and money out
  - fees
  - parsed transactions
- Draws multiple visuals:
  - money flow bars
  - category donut
  - balance trend line
  - spending timeline

## Run it

```bash
python3 server.py
```

Then open `http://localhost:8000`.


## Notes

- This is tuned for text-based RBC statement PDFs, not scanned image PDFs.
- The app stores parsed statement data in `localStorage` on the same browser and device.
- Original PDFs are archived into `storage/YYYY-MM/` based on the statement month.
- Each month folder also gets an `index.json` file containing parsed statement summaries and transactions for future month-over-month pages.
- `storage/manifest.json` is maintained as a simple local record of archived uploads.
- The `storage/` archive is git-ignored by default, so your bank statements are not meant to be committed to a public repository.
- RBC statement layouts vary, so the parser uses heuristics and may need small adjustments for your exact debit or credit statement format.
- If a statement does not include clean transaction rows in extractable text, the summary cards may still work better than the transaction table.

## Files

- `index.html` contains the layout
- `styles.css` contains the cute responsive styling
- `app.js` handles PDF parsing, categorization, and chart rendering
- `server.py` serves the app and saves uploaded PDFs into the repo
