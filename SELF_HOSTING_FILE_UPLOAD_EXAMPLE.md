# File Upload Example - Self-Hosted Setup

## How to Use File Uploads

The self-hosted backend now supports file uploads for logos, product images, and documents.

### In Your Components

```tsx
import { useState } from 'react';
import { localApi } from '@/lib/localApi';
import { toast } from 'sonner';

function FileUploadExample() {
  const [uploading, setUploading] = useState(false);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large. Maximum size is 5MB.');
      return;
    }

    setUploading(true);
    try {
      // Upload file (type can be 'logos', 'products', or 'documents')
      const result = await localApi.storage.upload(file, 'products');
      
      // Get the file URL
      const url = localApi.storage.getFileUrl('products', result.filename);
      setFileUrl(url);
      
      // Save URL to database (e.g., update product with logo_url: url)
      toast.success('File uploaded successfully!');
    } catch (error) {
      console.error('Upload failed:', error);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        onChange={handleFileUpload}
        accept="image/*"
        disabled={uploading}
      />
      {uploading && <p>Uploading...</p>}
      {fileUrl && <img src={fileUrl} alt="Uploaded" />}
    </div>
  );
}
```

### Supported File Types

- **Images**: JPEG, PNG, GIF, WEBP
- **Documents**: PDF, DOC, DOCX
- **Max size**: 5MB per file

### Upload Categories

1. **logos** - Business and department logos
2. **products** - Product images
3. **documents** - Invoices, receipts, ID documents

### Files are Stored In

- Backend directory: `backend/uploads/{type}/{filename}`
- Accessed via: `http://localhost:3001/api/files/{type}/{filename}`

## Next Steps

When components need to upload files (like product images or logos), use the `localApi.storage.upload()` method instead of Supabase storage.

Replace any Supabase storage calls with:
- `supabase.storage.from(...).upload()` → `localApi.storage.upload(file, type)`
- `supabase.storage.from(...).getPublicUrl()` → `localApi.storage.getFileUrl(type, filename)`
- `supabase.storage.from(...).remove()` → `localApi.storage.delete(type, filename)`
