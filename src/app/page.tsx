'use client'

import { useState, useRef, useCallback } from 'react'
import { Camera, Upload, Loader2, RotateCcw, Sparkles, AlertCircle } from 'lucide-react'
import { ImageAnalysisResult } from '@/types/menu'
import { formatPrice } from '@/lib/utils'

export default function Home() {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraError, setCameraError] = useState<string | null>(null)

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null)
      console.log('=== カメラ起動開始 ===')
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true
      })
      
      console.log('✅ ストリーム取得成功')
      
      if (videoRef.current) {
        const video = videoRef.current
        console.log('📺 Video要素にストリーム設定')
        video.srcObject = mediaStream
        
        // 複数のタイミングで自動再生を試行
        const attemptAutoPlay = async () => {
          try {
            await video.play()
            console.log('✅ 自動再生成功')
            return true
          } catch (error: any) {
            console.log('自動再生失敗:', error.message)
            return false
          }
        }
        
        // 1. 即座に試行
        const immediateSuccess = await attemptAutoPlay()
        
        if (!immediateSuccess) {
          // 2. loadedmetadata後に試行
          video.onloadedmetadata = async () => {
            console.log('📺 メタデータ読み込み完了')
            const metadataSuccess = await attemptAutoPlay()
            
            if (!metadataSuccess) {
              // 3. 短い遅延後に試行
              setTimeout(async () => {
                const delayedSuccess = await attemptAutoPlay()
                if (!delayedSuccess) {
                  console.log('⚠️ 自動再生に失敗しました。手動操作が必要です。')
                }
              }, 500)
            }
          }
          
          // 4. canplay後にも試行
          video.oncanplay = async () => {
            console.log('🎥 Can play')
            await attemptAutoPlay()
          }
        }
      }
      
      setStream(mediaStream)
      console.log('🎉 カメラセットアップ完了')
      
    } catch (error: any) {
      console.error('💥 カメラエラー:', error)
      setCameraError(`カメラアクセスエラー: ${error.message}`)
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
      
      console.log('📸 撮影開始')
      console.log('Video寸法:', video.videoWidth, 'x', video.videoHeight)
      
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        setCameraError('ビデオが正しく読み込まれていません。手動再生ボタンを試してください。')
        return
      }
      
      const context = canvas.getContext('2d')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (context) {
        context.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL('image/jpeg')
        setCapturedImage(imageData)
        stopCamera()
        console.log('📸 撮影完了')
      }
    }
  }, [stopCamera])

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB制限
        setError('ファイルサイズが大きすぎます。10MB以下のファイルを選択してください。')
        return
      }
      
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setCapturedImage(imageData)
        setError(null)
      }
      reader.readAsDataURL(file)
    }
  }, [])

  const analyzeImage = async () => {
    if (!capturedImage) return
    
    setIsAnalyzing(true)
    setError(null)
    
    try {
      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageData: capturedImage }),
      })
      
      if (response.ok) {
        const result = await response.json()
        setAnalysisResult(result)
      } else {
        const errorData = await response.json()
        setError(errorData.error || '画像解析に失敗しました')
      }
    } catch (error) {
      console.error('Error analyzing image:', error)
      setError('ネットワークエラーが発生しました。もう一度お試しください。')
    } finally {
      setIsAnalyzing(false)
    }
  }

  const resetCapture = () => {
    setCapturedImage(null)
    setAnalysisResult(null)
    setError(null)
    setCameraError(null)
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
            <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              Cafe Menu AI
            </h1>
            <p className="text-center text-blue-100 mt-2">
              カメラでメニューを撮影して詳細情報を確認
            </p>
          </div>

          {/* Error Messages */}
          {(error || cameraError) && (
            <div className="p-4 bg-red-50 border-l-4 border-red-400">
              <div className="flex items-center">
                <AlertCircle className="w-5 h-5 text-red-400 mr-2" />
                <p className="text-red-700 text-sm">{error || cameraError}</p>
              </div>
            </div>
          )}

          {/* Camera/Image Section */}
          <div className="p-6">
            {!capturedImage ? (
              <div className="space-y-4">
                {stream ? (
                  <div className="relative">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      autoPlay
                      className="w-full h-64 rounded-lg shadow-md"
                      style={{
                        minHeight: '200px',
                        maxHeight: '400px',
                        objectFit: 'cover'
                      }}
                      onLoadedData={async () => {
                        console.log('🎥 Video data loaded')
                        if (videoRef.current && videoRef.current.paused) {
                          try {
                            await videoRef.current.play()
                            console.log('✅ onLoadedData後の再生成功')
                          } catch (error) {
                            console.log('onLoadedData後の再生失敗')
                          }
                        }
                      }}
                      onCanPlay={async () => {
                        console.log('🎥 Can play')
                        if (videoRef.current && videoRef.current.paused) {
                          try {
                            await videoRef.current.play()
                            console.log('✅ onCanPlay後の再生成功')
                          } catch (error) {
                            console.log('onCanPlay後の再生失敗')
                          }
                        }
                      }}
                      onPlaying={() => {
                        console.log('🎥 Playing - 再生開始!')
                      }}
                      onError={(e) => {
                        console.error('🎥 Video error:', e)
                        setCameraError('ビデオ表示エラーが発生しました')
                      }}
                    />
                    <button
                      onClick={captureImage}
                      className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-full p-4 shadow-lg hover:bg-gray-50 transition-all duration-200 hover:scale-105"
                    >
                      <Camera className="w-8 h-8 text-blue-600" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 hover:border-blue-400 transition-colors">
                      <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">
                        メニューの写真を撮影またはアップロード
                      </p>
                      <div className="space-y-3">
                        <button
                          onClick={startCamera}
                          className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
                        >
                          <Camera className="w-5 h-5" />
                          カメラを起動
                        </button>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="w-full border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 transition-all duration-200 flex items-center justify-center gap-2"
                        >
                          <Upload className="w-5 h-5" />
                          ファイルをアップロード
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* デバッグ情報 - 問題がある場合のみ表示 */}
                {stream && videoRef.current && (
                  videoRef.current.videoWidth === 0 || 
                  videoRef.current.videoHeight === 0 || 
                  videoRef.current.paused
                ) && (
                  <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
                    <div className="text-sm text-yellow-800 mb-2">⚠️ カメラ調整が必要</div>
                    <div className="space-y-1 text-xs text-yellow-700 mb-2">
                      <div>ストリーム: ✅ アクティブ</div>
                      <div>Video寸法: {videoRef.current?.videoWidth || 0}x{videoRef.current?.videoHeight || 0}</div>
                      <div>再生状態: {videoRef.current?.paused ? '⏸️ 停止中' : '▶️ 再生中'}</div>
                    </div>
                    
                    <div className="space-y-1">
                      <button
                        onClick={async () => {
                          if (videoRef.current) {
                            try {
                              await videoRef.current.play()
                              console.log('✅ 手動再生成功')
                            } catch (error) {
                              console.error('❌ 手動再生失敗:', error)
                            }
                          }
                        }}
                        className="w-full px-3 py-1 bg-green-200 text-green-800 rounded text-xs"
                      >
                        ▶️ カメラを開始
                      </button>
                      
                      <button
                        onClick={() => {
                          if (videoRef.current && stream) {
                            videoRef.current.srcObject = null
                            setTimeout(() => {
                              if (videoRef.current) videoRef.current.srcObject = stream
                            }, 100)
                          }
                        }}
                        className="w-full px-3 py-1 bg-blue-200 text-blue-800 rounded text-xs"
                      >
                        🔄 リセット
                      </button>
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
                <div className="relative">
                  <img
                    src={capturedImage}
                    alt="Captured menu"
                    className="w-full rounded-lg shadow-md"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={resetCapture}
                    className="flex-1 border border-gray-300 text-gray-700 py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    再撮影
                  </button>
                  <button
                    onClick={analyzeImage}
                    disabled={isAnalyzing}
                    className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isAnalyzing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    {isAnalyzing ? '解析中...' : 'AI解析開始'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Results */}
          {isAnalyzing && (
            <div className="p-6 border-t bg-blue-50">
              <div className="flex items-center justify-center gap-2 text-blue-600">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>AI画像解析中...</span>
              </div>
              <div className="mt-2 text-center text-sm text-blue-500">
                少々お待ちください
              </div>
            </div>
          )}

          {analysisResult && (
            <div className="p-6 border-t space-y-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-lg text-gray-800">解析結果</h3>
                <span className="text-sm text-gray-500">
                  信頼度: {Math.round(analysisResult.confidence * 100)}%
                </span>
              </div>
              
              {/* デバッグ情報 */}
              <div className="bg-gray-50 p-3 rounded-lg text-xs">
                <div className="font-medium text-gray-700 mb-2">🔍 デバッグ情報</div>
                <div className="text-gray-600 space-y-1">
                  <div>Vision API使用: {analysisResult.usingVisionAPI ? 'はい' : 'いいえ (モック)'}</div>
                  <div>解析時刻: {analysisResult.analysisTime ? new Date(analysisResult.analysisTime).toLocaleTimeString() : 'N/A'}</div>
                  <div>検出キーワード数: {analysisResult.detectedItems.length}個</div>
                  <div>マッチしたメニュー数: {analysisResult.suggestedMenus.length}個</div>
                  
                  {/* 環境変数チェック情報 */}
                  {analysisResult.debugInfo?.envCheck && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="font-medium text-gray-700 mb-1">📋 環境変数チェック</div>
                      <div className="ml-2 space-y-1">
                        <div>Project ID: {analysisResult.debugInfo.envCheck.hasProjectId ? '✅' : '❌'} ({analysisResult.debugInfo.envCheck.projectIdLength}文字)</div>
                        <div>Private Key: {analysisResult.debugInfo.envCheck.hasPrivateKey ? '✅' : '❌'}</div>
                        <div>Client Email: {analysisResult.debugInfo.envCheck.hasClientEmail ? '✅' : '❌'} ({analysisResult.debugInfo.envCheck.clientEmailDomain})</div>
                      </div>
                    </div>
                  )}
                  
                  {/* Vision APIエラー情報 */}
                  {analysisResult.debugInfo?.visionError && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="font-medium text-red-600 mb-1">⚠️ Vision APIエラー</div>
                      <div className="ml-2 space-y-1 text-red-600">
                        <div>エラー名: {analysisResult.debugInfo.visionError.name}</div>
                        <div>メッセージ: {analysisResult.debugInfo.visionError.message}</div>
                        {analysisResult.debugInfo.visionError.status && (
                          <div>ステータス: {analysisResult.debugInfo.visionError.status}</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {/* Vision API成功情報 */}
                  {analysisResult.debugInfo?.visionSuccess && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="font-medium text-green-600 mb-1">✅ Vision API成功</div>
                      <div className="ml-2 space-y-1 text-green-600">
                        <div>検出ラベル数: {analysisResult.debugInfo.labelsCount}個</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {analysisResult.detectedItems.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">検出されたアイテム</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysisResult.detectedItems.map((item, index) => (
                      <span
                        key={index}
                        className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {analysisResult.suggestedMenus.length > 0 ? (
                <div>
                  <h4 className="font-medium text-gray-700 mb-3">
                    おすすめメニュー ({analysisResult.suggestedMenus.length}件)
                  </h4>
                  <div className="space-y-4">
                    {analysisResult.suggestedMenus.map((menu) => (
                      <div key={menu.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-semibold text-gray-800">{menu.name}</h5>
                          {menu.price && (
                            <span className="text-blue-600 font-bold text-lg">
                              ¥{formatPrice(menu.price)}
                            </span>
                          )}
                        </div>
                        <p className="text-gray-600 text-sm mb-3">{menu.description}</p>
                        
                        {menu.category && (
                          <div className="mb-2">
                            <span className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {menu.category}
                            </span>
                          </div>
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
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">
                    <AlertCircle className="w-12 h-12 mx-auto" />
                  </div>
                  <p className="text-gray-600">
                    該当するメニューが見つかりませんでした
                  </p>
                  <p className="text-gray-500 text-sm mt-1">
                    別の角度から撮影してみてください
                  </p>
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
