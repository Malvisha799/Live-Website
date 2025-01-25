import os
from flask import Flask, request, jsonify, send_file, send_from_directory
from flask_cors import CORS
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import letter, landscape
from reportlab.lib.units import inch
import traceback
from compress import compress_pdf_file
import tempfile
import mimetypes

app = Flask(__name__, static_folder='.')
CORS(app)

# Ensure proper MIME type for PDF
mimetypes.add_type('application/pdf', '.pdf')

# Directories for uploaded and processed files
UPLOAD_FOLDER = os.path.join(app.root_path, 'uploads')
OUTPUT_FOLDER = os.path.join(app.root_path, 'outputs')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB in bytes

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory('.', path)

@app.route('/compress', methods=['POST'])
def compress():
    temp_input_path = None
    output_path = None
    
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        
        file = request.files['file']
        if not file or file.filename == '':
            return jsonify({"error": "No file selected"}), 400
            
        if not file.filename.lower().endswith('.pdf'):
            return jsonify({"error": "Please upload a PDF file"}), 400

        # Check file size
        file.seek(0, os.SEEK_END)
        size = file.tell()
        file.seek(0)
        
        if size > MAX_FILE_SIZE:
            return jsonify({"error": "File size exceeds 100MB limit"}), 400

        # Get and validate target percentage
        try:
            target_percentage = float(request.form.get('target_percentage', 0))
            if not 1 <= target_percentage <= 99:
                return jsonify({"error": "Target percentage must be between 1 and 99"}), 400
        except (TypeError, ValueError):
            return jsonify({"error": "Invalid target percentage"}), 400

        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as temp_input:
            temp_input_path = temp_input.name
            file.save(temp_input_path)

            if not os.path.exists(temp_input_path) or os.path.getsize(temp_input_path) == 0:
                raise ValueError("Uploaded file is empty or invalid")

            # Set up output path
            output_filename = f"compressed_{file.filename}"
            output_path = os.path.join(UPLOAD_FOLDER, output_filename)

            try:
                # Perform compression
                compressed_size, compressed_unit, reduction = compress_pdf_file(
                    temp_input_path, 
                    output_path, 
                    target_percentage
                )

                if not os.path.exists(output_path) or os.path.getsize(output_path) == 0:
                    raise ValueError("Compression failed - output file is invalid")

                # Return the compressed file
                return send_file(
                    output_path,
                    mimetype='application/pdf',
                    as_attachment=True,
                    download_name=output_filename,
                    conditional=True
                )

            except Exception as compression_error:
                raise ValueError(str(compression_error))

    except Exception as e:
        # Clean up any temporary files
        if temp_input_path and os.path.exists(temp_input_path):
            try:
                os.unlink(temp_input_path)
            except:
                pass
        
        if output_path and os.path.exists(output_path):
            try:
                os.unlink(output_path)
            except:
                pass

        error_message = str(e)
        print(f"Compression error: {error_message}")
        print(traceback.format_exc())
        return jsonify({"error": error_message}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)