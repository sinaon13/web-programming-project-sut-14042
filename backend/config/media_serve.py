import os
import re
from django.http import StreamingHttpResponse, HttpResponse, Http404
from django.conf import settings
import mimetypes

def serve_media_with_range(request, path):
    file_path = os.path.join(settings.MEDIA_ROOT, path)
    if not os.path.exists(file_path):
        raise Http404("Media file not found")
        
    file_size = os.path.getsize(file_path)
    content_type, _ = mimetypes.guess_type(file_path)
    content_type = content_type or 'application/octet-stream'
    
    range_header = request.META.get('HTTP_RANGE', '').strip()
    
    if range_header:
        range_match = re.search(r'bytes=(\d+)-(\d*)', range_header)
        if range_match:
            first_byte = int(range_match.group(1))
            last_byte_str = range_match.group(2)
            last_byte = int(last_byte_str) if last_byte_str else file_size - 1
            
            if first_byte >= file_size:
                response = HttpResponse(status=416)
                response['Content-Range'] = f'bytes */{file_size}'
                return response
                
            length = last_byte - first_byte + 1
            
            def file_iterator():
                with open(file_path, 'rb') as f:
                    f.seek(first_byte)
                    remaining = length
                    while remaining > 0:
                        chunk_size = min(remaining, 8192)
                        data = f.read(chunk_size)
                        if not data:
                            break
                        yield data
                        remaining -= len(data)
                        
            response = StreamingHttpResponse(file_iterator(), status=206, content_type=content_type)
            response['Content-Range'] = f'bytes {first_byte}-{last_byte}/{file_size}'
            response['Accept-Ranges'] = 'bytes'
            response['Content-Length'] = str(length)
            return response
            
    # Fallback to standard response
    with open(file_path, 'rb') as f:
        response = HttpResponse(f.read(), content_type=content_type)
        response['Accept-Ranges'] = 'bytes'
        response['Content-Length'] = str(file_size)
        return response
