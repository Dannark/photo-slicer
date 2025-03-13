import React, { useCallback, useState, useRef, useEffect } from 'react';

interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  imageLoaded?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, imageLoaded }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleFile = (file: File) => {
    if (file && file.type.startsWith('image/')) {
      onImageUpload(file);
      setIsDragging(false);
      dragCounter.current = 0;
    }
  };

  const handleDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer?.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const dt = e.dataTransfer;
    if (dt?.files && dt.files.length > 0) {
      handleFile(dt.files[0]);
    }
  }, [handleFile]);

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <div className="image-uploader">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <div className="upload-content">
          {imageLoaded ? (
            <button className="upload-button compact" onClick={handleButtonClick}>
              Trocar imagem
            </button>
          ) : (
            <>
              <button className="upload-button" onClick={handleButtonClick}>
                Escolher arquivo
              </button>
              <p>ou arraste uma imagem</p>
            </>
          )}
        </div>
      </div>
      {isDragging && (
        <div 
          className="drag-overlay"
          onDragEnter={e => e.preventDefault()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            e.preventDefault();
            e.stopPropagation();
            const dt = e.dataTransfer;
            if (dt?.files && dt.files.length > 0) {
              handleFile(dt.files[0]);
            }
          }}
        >
          <div className="drop-zone">
            <div className="drop-zone-border">
              <div className="drop-zone-content">
                <p>Solte a imagem aqui</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ImageUploader; 