# data-sidebar-chat
Data Sidebar Chat

This project provides a sidebar chat interface for Google Sheets. After installing the script, a custom menu **Data Whisperer** will appear. Use the *Show Sidebar* item to open the chat sidebar.

## Column and row analysis

When your prompt references specific columns or rows (e.g. `col A`, `column C`, `row 5`, or `rows 2-4`), the add‑on will automatically gather that data from the active sheet. The extracted data is passed to the AI as JSON with the following shape:

```json
{
  "columns": {
    "A": ["value1", "value2"],
    "C": ["..."]
  },
  "rows": {
    "3": ["r3c1", "r3c2", "..."]
  }
}
```

Column data starts from row 2 so the header row remains untouched. Invalid or out‑of‑bounds references are ignored.
