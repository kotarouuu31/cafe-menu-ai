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
      
      // デバイス一覧を確認
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      console.log('利用可能なカメラ:', videoDevices.length, '台')
      
      // 制約を段階的に緩和
      const constraintOptions = [
        // 1. 理想的な設定（背面カメラ）
        {
          video: {
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // 2. 背面カメラのみ
        {
          video: { facingMode: 'environment' }
        },
        // 3. 任意のカメラ
        {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        },
        // 4. 最小限の設定
        {
          video: true
        }
      ]
      
      let mediaStream: MediaStream | null = null
      let lastError: any = null
      
      for (let i = 0; i < constraintOptions.length; i++) {
        try {
          console.log(`カメラ制約 ${i + 1} を試行:`, constraintOptions[i])
          mediaStream = await navigator.mediaDevices.getUserMedia(constraintOptions[i])
          console.log('カメラ取得成功:', mediaStream.getTracks().length, 'トラック')
          break
        } catch (error) {
          console.log(`制約 ${i + 1} 失敗:`, error)
          lastError = error
        }
      }
      
      if (!mediaStream) {
        throw lastError || new Error('すべての制約が失敗しました')
      }
      
      if (videoRef.current) {
        console.log('ビデオ要素にストリーム設定中...')
        videoRef.current.srcObject = mediaStream
        
        // Promise ベースでplay()を実行
        try {
          await new Promise<void>((resolve, reject) => {
            if (!videoRef.current) {
              reject(new Error('Video element not found'))
              return
            }
            
            const video = videoRef.current
            
            video.onloadedmetadata = async () => {
              try {
                console.log('メタデータ読み込み完了、再生開始...')
                await video.play()
                console.log('ビデオ再生成功')
                resolve()
              } catch (playError) {
                console.error('再生エラー:', playError)
                reject(playError)
              }
            }
            
            video.onerror = (e) => {
              console.error('ビデオエラー:', e)
              reject(new Error('Video error'))
            }
            
            // 5秒でタイムアウト
            setTimeout(() => {
              reject(new Error('Video load timeout'))
            }, 5000)
          })
        } catch (playError) {
          console.error('ビデオ再生に失敗:', playError)
          // 再生に失敗してもストリームは設定されているので続行
        }
      }
      
      setStream(mediaStream)
      console.log('=== カメラ起動完了 ===')
      
    } catch (error: any) {
      console.error('=== カメラエラー詳細 ===')
      console.error('エラー名:', error.name)
      console.error('エラーメッセージ:', error.message)
      
      let errorMessage = 'カメラへのアクセスに失敗しました。'
      
      if (error.name === 'NotAllowedError') {
        errorMessage += 'ブラウザの設定でカメラの使用を許可してください。'
      } else if (error.name === 'NotFoundError') {
        errorMessage += 'カメラデバイスが見つかりません。'
      } else if (error.name === 'NotReadableError') {
        errorMessage += 'カメラが他のアプリケーションで使用されています。'
      } else if (error.name === 'OverconstrainedError') {
        errorMessage += 'カメラの制約を満たすデバイスがありません。'
      } else {
        errorMessage += `詳細: ${error.message}`
      }
      
      setCameraError(errorMessage)
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
        // 自動解析は行わず、ユーザーが手動で解析ボタンを押すように変更
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
                      className="w-full rounded-lg shadow-md"
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
