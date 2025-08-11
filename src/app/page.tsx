'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2 } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/menu'

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
      setStream(mediaStream)
    } catch (error) {
      console.error('Error accessing camera:', error)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
  }, [stream])

  const captureImage = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current
      const video = videoRef.current
      const context = canvas.getContext('2d')
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (context) {
        context.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        stopCamera()
        analyzeImage(imageData)
      }
    }
  }, [stopCamera])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
        analyzeImage(imageData)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const analyzeImage = async (imageData: string) => {
    setIsAnalyzing(true)
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setAnalysisResult(result)
      } else {
        console.error('Failed to analyze image')
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetCapture = () => {
    setCapturedImage(null)
    setAnalysisResult(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-2xl font-bold text-center">Cafe Menu AI</h1>
            <p className="text-center text-blue-100 mt-2">
              カメラでメニューを撮影して詳細情報を確認
            </p>
          </div>

          {/* Camera/Image Section */}
          <div className="p-6">
            {!capturedImage ? (
              <div className="space-y-4">
                {stream ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full rounded-lg"
                    />
                    <button
                      onClick={captureImage}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-4 shadow-lg hover:bg-gray-50 transition-colors"
                    >
                      <Camera className="w-8 h-8 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                      <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        メニューの写真を撮影またはアップロード
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={startCamera}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                        >
                          <Camera className="w-5 h-5" />
                          カメラを起動
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload className="w-5 h-5" />
                          ファイルをアップロード
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            ) : (
              <div className="space-y-4">
                <img
                  src={capturedImage}
                  alt="Captured menu"
                  className="w-full rounded-lg"
                />
                <button
                  onClick={resetCapture}
                  className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  再撮影
                </button>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          {isAnalyzing && (
            <div className="p-6 border-t">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>画像を解析中...</span>
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="p-6 border-t space-y-4">
              <h3 className="font-semibold text-lg">解析結果</h3>
              
              {analysisResult.detectedItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">検出されたアイテム:</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.detectedItems.map((item, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.suggestedMenus.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">おすすめメニュー:</h4>
                  <div className="space-y-3">
                    {analysisResult.suggestedMenus.map((menu) => (
                      <div key={menu.id} className="border rounded-lg p-4">
                        <h5 className="font-medium">{menu.name}</h5>
                        <p className="text-gray-600 text-sm mt-1">{menu.description}</p>
                        {menu.price && (
                          <p className="text-blue-600 font-medium mt-2">
                            ¥{menu.price.toLocaleString()}
                          </p>
                        )}
                        {menu.allergens.length > 0 && (
                          <div className="mt-2">
                            <span className="text-red-600 text-sm font-medium">
                              アレルゲン: {menu.allergens.join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  )
}
