# PropertyEdge

PropertyEdge is a property analysis application built with Flask.

## Project Structure

- `app.py` - Flask application entrypoint
- `propertyedge_core.py` - Core business logic module
- `storage.py` - Data storage module
- `ppd_sqlite.py` - SQLite database interface for property price data
- `templates/` - HTML templates
- `static/` - Static assets (CSS, JS)
- `data/` - Data storage directory

## Setup

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Run the application:
   ```bash
   python app.py
   ```

## License

MIT License