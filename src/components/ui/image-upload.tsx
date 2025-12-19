import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Image as ImageIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ImageUploadProps {
  value?: string | null;
  onChange: (url: string | null) => void;
  bucket?: string;
  folder?: string;
  maxSizeKB?: number;
  className?: string;
}

// Compress image to target size
async function compressImage(file: File, maxSizeKB: number): Promise<File> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };

    img.onload = () => {
      const canvas = document.createElement("canvas");
      let { width, height } = img;
      
      // Start with quality 0.9 and reduce if needed
      let quality = 0.9;
      const maxSize = maxSizeKB * 1024;
      
      // Scale down large images
      const maxDimension = 1200;
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = (height / width) * maxDimension;
          width = maxDimension;
        } else {
          width = (width / height) * maxDimension;
          height = maxDimension;
        }
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);

      const tryCompress = (q: number): void => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }

            if (blob.size <= maxSize || q <= 0.1) {
              const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, ".jpg"), {
                type: "image/jpeg",
              });
              resolve(compressedFile);
            } else {
              // Reduce quality and try again
              tryCompress(q - 0.1);
            }
          },
          "image/jpeg",
          q
        );
      };

      tryCompress(quality);
    };

    img.onerror = () => reject(new Error("Failed to load image"));
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

export function ImageUpload({
  value,
  onChange,
  bucket = "department-logos",
  folder = "products",
  maxSizeKB = 200,
  className,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(value || null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    setIsUploading(true);
    try {
      let fileToUpload = file;
      const maxSize = maxSizeKB * 1024;

      // Compress if needed
      if (file.size > maxSize) {
        toast.info(`Compressing image (${(file.size / 1024).toFixed(0)}KB → ${maxSizeKB}KB)...`);
        fileToUpload = await compressImage(file, maxSizeKB);
        toast.success(`Image compressed to ${(fileToUpload.size / 1024).toFixed(0)}KB`);
      }

      // Generate unique filename
      const ext = fileToUpload.name.split(".").pop() || "jpg";
      const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, fileToUpload, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      const publicUrl = urlData.publicUrl;
      setPreview(publicUrl);
      onChange(publicUrl);
      toast.success("Image uploaded successfully");
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  const handleRemove = async () => {
    if (value) {
      try {
        // Extract path from URL
        const url = new URL(value);
        const pathParts = url.pathname.split("/storage/v1/object/public/")[1];
        if (pathParts) {
          const [bucketName, ...fileParts] = pathParts.split("/");
          const filePath = fileParts.join("/");
          await supabase.storage.from(bucketName).remove([filePath]);
        }
      } catch (error) {
        console.error("Failed to delete old image:", error);
      }
    }
    setPreview(null);
    onChange(null);
  };

  return (
    <div className={className}>
      <Label className="mb-2 block">Product Image</Label>
      <div className="space-y-3">
        {preview ? (
          <div className="relative inline-block">
            <img
              src={preview}
              alt="Product preview"
              className="w-24 h-24 object-cover rounded-lg border"
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="w-24 h-24 border-2 border-dashed rounded-lg flex items-center justify-center bg-muted/50">
            <ImageIcon className="h-8 w-8 text-muted-foreground" />
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id="image-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => inputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {preview ? "Change Image" : "Upload Image"}
              </>
            )}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Max {maxSizeKB}KB. Larger images will be compressed automatically.
        </p>
      </div>
    </div>
  );
}
