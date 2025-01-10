import React, { useState, useRef } from 'react';
import { Upload, X, FileText, Image, File } from 'lucide-react';

const FileUploader = ({ onUpload, socketRef, user }) => {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file) => {
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      alert("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("userId", user.id);

    try {
      // Create file metadata
      const fileData = {
        name: file.name,
        size: file.size,
        type: file.type,
        uploadedBy: user.id,
        timestamp: new Date().toISOString()
      };

      // If it's an image, create preview
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setPreviewUrl(e.target.result);
        };
        reader.readAsDataURL(file);
      }

      // Simulate upload progress
      const interval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(interval);
            return prev;
          }
          return prev + 10;
        });
      }, 200);

      // Emit socket event for file upload
      socketRef.current.emit('file-upload', {
        fileData,
        file: await fileToBase64(file)
      });

      // Listen for upload completion
      socketRef.current.once('file-upload-complete', (response) => {
        clearInterval(interval);
        setUploadProgress(100);
        onUpload(response);
        
        setTimeout(() => {
          setUploading(false);
          setUploadProgress(0);
          setPreviewUrl(null);
        }, 1000);
      });

    } catch (error) {
      console.error('Upload error:', error);
      setUploading(false);
      setUploadProgress(0);
      alert('Error uploading file');
    }
  };

  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const getFileIcon = (type) => {
    if (type.startsWith('image/')) return <Image className="w-6 h-6" />;
    if (type.startsWith('text/')) return <FileText className="w-6 h-6" />;
    return <File className="w-6 h-6" />;
  };

  return (
    <div className="relative">
      <div
        className={`h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center p-4 transition-colors
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="w-full max-w-xs">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-600">Uploading...</span>
              <span className="text-sm text-gray-600">{uploadProgress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-500 rounded-full h-2 transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        ) : (
          <>
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <p className="text-sm text-gray-500 text-center">
              Drag and drop files here or{" "}
              <button
                onClick={() => fileInputRef.current.click()}
                className="text-blue-500 hover:text-blue-600"
              >
                browse
              </button>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleChange}
              accept="image/*,.pdf,.doc,.docx,.txt"
            />
          </>
        )}
      </div>

      {previewUrl && (
        <div className="absolute top-0 right-0 p-2">
          <button
            onClick={() => setPreviewUrl(null)}
            className="p-1 bg-white rounded-full shadow hover:bg-gray-100"
          >
            <X className="w-4 h-4" />
          </button>
          <img
            src={previewUrl}
            alt="Preview"
            className="w-16 h-16 object-cover rounded"
          />
        </div>
      )}
    </div>
  );
};

export default FileUploader;