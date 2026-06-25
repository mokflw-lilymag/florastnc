interface ImageOptimizeOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  format?: "jpeg" | "webp" | "png";
}

export async function optimizeImage(
  file: File,
  options: ImageOptimizeOptions = {},
): Promise<File> {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.8,
    format = "jpeg",
  } = options;

  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      try {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width *= ratio;
          height *= ratio;
        }
        canvas.width = width;
        canvas.height = height;
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(
                new File(
                  [blob],
                  `optimized_${file.name.replace(/\.[^/.]+$/, "")}.${format}`,
                  { type: `image/${format}` },
                ),
              );
            } else {
              reject(new Error("이미지 압축 실패"));
            }
          },
          `image/${format}`,
          quality,
        );
      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("이미지 로드 실패"));
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export async function validateAndOptimizeImage(file: File): Promise<{
  file: File;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}> {
  const originalSize = file.size;

  if (originalSize > 5 * 1024 * 1024) {
    const optimizedFile = await optimizeImage(file, {
      maxWidth: 800,
      maxHeight: 800,
      quality: 0.6,
    });
    return {
      file: optimizedFile,
      originalSize,
      optimizedSize: optimizedFile.size,
      compressionRatio: Math.round((1 - optimizedFile.size / originalSize) * 100),
    };
  }

  if (originalSize > 512 * 1024) {
    const optimizedFile = await optimizeImage(file, {
      maxWidth: 1200,
      maxHeight: 1200,
      quality: 0.8,
    });
    return {
      file: optimizedFile,
      originalSize,
      optimizedSize: optimizedFile.size,
      compressionRatio: Math.round((1 - optimizedFile.size / originalSize) * 100),
    };
  }

  return {
    file,
    originalSize,
    optimizedSize: originalSize,
    compressionRatio: 0,
  };
}
