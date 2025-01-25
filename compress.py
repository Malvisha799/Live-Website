from PyPDF2 import PdfReader, PdfWriter
import os

def compress_pdf_file(input_path, output_path, target_percentage):
    try:
        # Validate input file
        if not os.path.exists(input_path):
            raise Exception("Input file does not exist")
            
        if os.path.getsize(input_path) == 0:
            raise Exception("Input file is empty")

        # Read the input PDF
        reader = PdfReader(input_path)
        writer = PdfWriter()

        # Get initial file size
        initial_size = os.path.getsize(input_path)

        if len(reader.pages) == 0:
            raise Exception("PDF file contains no pages")

        # Copy pages to the writer with compression settings
        for page in reader.pages:
            # Compress page content
            if hasattr(page, 'compress_content_streams'):
                page.compress_content_streams()  # This applies compression to the content streams
            writer.add_page(page)

        # Add metadata
        try:
            if hasattr(reader, 'metadata') and reader.metadata:
                writer.add_metadata(reader.metadata)
        except:
            # If metadata addition fails, continue without it
            pass

        # Write the compressed PDF with maximum compression
        with open(output_path, "wb") as output_file:
            writer.write(output_file)

        # Verify the output file
        if not os.path.exists(output_path):
            raise Exception("Failed to create output file")
            
        if os.path.getsize(output_path) == 0:
            raise Exception("Output file is empty")

        # Get compressed file size
        compressed_size = os.path.getsize(output_path)
        
        # Calculate reduction percentage
        reduction = ((initial_size - compressed_size) / initial_size) * 100

        # If compression increased file size or had minimal effect
        if compressed_size >= initial_size:
            raise Exception("Could not compress the PDF further")

        # Convert sizes to appropriate units
        def convert_size(size_in_bytes):
            for unit in ['B', 'KB', 'MB', 'GB']:
                if size_in_bytes < 1024.0:
                    return f"{size_in_bytes:.2f}", unit
                size_in_bytes /= 1024.0
            return f"{size_in_bytes:.2f}", 'TB'

        compressed_size_value, compressed_unit = convert_size(compressed_size)
        
        return float(compressed_size_value), compressed_unit, reduction

    except Exception as e:
        error_msg = str(e)
        print(f"Error compressing PDF: {error_msg}")
        # Clean up the output file if it exists
        if os.path.exists(output_path):
            try:
                os.remove(output_path)
            except:
                pass
        raise Exception(error_msg)