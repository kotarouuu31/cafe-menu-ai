'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, Loader2, AlertCircle, RefreshCw, RotateCcw, Sparkles } from 'lucide-react'
import { ImageAnalysisResult, Dish } from '@/types/menu'
import { formatPrice } from '@/lib/utils'
import PWAInstall from '@/components/PWAInstall'

// 安全な配列変換関数
const safeArrayFromString = (value: string | string[]): string[] => {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : [value]
    } catch {
      return value ? [value] : []
    }
  }
  return []
}

export function CafeMenuApp() {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [analysisResult, setAnalysisResult] = useState<ImageAnalysisResult | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [error, setError] = useState<string>('')
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>('environment')
  const [showDebugInfo, setShowDebugInfo] = useState(false)

  const startCamera = useCallback(async (preferredFacingMode: 'user' | 'environment' = 'environment') => {
    try {
      setError('')
      setIsLoading(true)
      
      // 既存のストリームを停止
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }

      // デバイス一覧を取得
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      
      console.log('利用可能なカメラデバイス:', videoDevices.map(d => ({ 
        id: d.deviceId, 
        label: d.label || 'Unknown Camera' 
      })))

      // 背面カメラを検出する関数
      const findBackCamera = (devices: MediaDeviceInfo[]) => {
        const backKeywords = ['back', 'rear', 'environment', 'world', '外向', '背面']
        
        // ラベルベースの検出
        const backCamera = devices.find(device => {
          const label = device.label.toLowerCase()
          return backKeywords.some(keyword => label.includes(keyword))
        })
        
        if (backCamera) {
          console.log('ラベルベースで背面カメラを検出:', backCamera.label)
          return backCamera
        }
        
        // インデックスベースの推測（最後のカメラまたは0番目以外）
        if (devices.length > 1) {
          const guessedBackCamera = devices[devices.length - 1] || devices.find((_, index) => index !== 0)
          if (guessedBackCamera) {
            console.log('インデックスベースで背面カメラを推測:', guessedBackCamera.label)
            return guessedBackCamera
          }
        }
        
        return null
      }

      let newStream: MediaStream | null = null
      
      if (preferredFacingMode === 'environment') {
        // 戦略1: facingMode exact指定
        try {
          console.log('戦略1: facingMode exact指定で背面カメラを試行')
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: { exact: 'environment' },
              width: { ideal: 1280, max: 1920 },
              height: { ideal: 720, max: 1080 }
            }
          })
          console.log('戦略1成功: exact指定で背面カメラを取得')
        } catch (error) {
          console.log('戦略1失敗:', error)
        }

        // 戦略2: facingMode ideal指定
        if (!newStream) {
          try {
            console.log('戦略2: facingMode ideal指定で背面カメラを試行')
            newStream = await navigator.mediaDevices.getUserMedia({
              video: { 
                facingMode: { ideal: 'environment' },
                width: { ideal: 1280, max: 1920 },
                height: { ideal: 720, max: 1080 }
              }
            })
            console.log('戦略2成功: ideal指定で背面カメラを取得')
          } catch (error) {
            console.log('戦略2失敗:', error)
          }
        }

        // 戦略3: デバイスID指定で背面カメラを試行
        if (!newStream && videoDevices.length > 0) {
          const backCamera = findBackCamera(videoDevices)
          if (backCamera) {
            try {
              console.log('戦略3: デバイスID指定で背面カメラを試行:', backCamera.label)
              newStream = await navigator.mediaDevices.getUserMedia({
                video: { 
                  deviceId: { exact: backCamera.deviceId },
                  width: { ideal: 1280, max: 1920 },
                  height: { ideal: 720, max: 1080 }
                }
              })
              console.log('戦略3成功: デバイスID指定で背面カメラを取得')
            } catch (error) {
              console.log('戦略3失敗:', error)
            }
          }
        }
      }

      // フロントカメラまたはフォールバック
      if (!newStream) {
        try {
          const facingMode = preferredFacingMode === 'user' ? 'user' : 'user'
          console.log(`フォールバック: ${facingMode}カメラを試行`)
          newStream = await navigator.mediaDevices.getUserMedia({
            video: { 
              facingMode: facingMode,
              width: { ideal: 640, max: 1280 },
              height: { ideal: 480, max: 720 }
            }
          })
          console.log(`フォールバック成功: ${facingMode}カメラを取得`)
        } catch (error) {
          console.log('フォールバック失敗:', error)
        }
      }

      // 最終フォールバック（制約なし）
      if (!newStream) {
        try {
          console.log('最終フォールバック: 制約なしでカメラを試行')
          newStream = await navigator.mediaDevices.getUserMedia({ video: true })
          console.log('最終フォールバック成功: 制約なしでカメラを取得')
        } catch (error) {
          console.log('最終フォールバック失敗:', error)
          throw new Error('カメラにアクセスできませんでした')
        }
      }

      if (!newStream) {
        throw new Error('カメラストリームを取得できませんでした')
      }

      // ストリーム情報をログ出力
      const tracks = newStream.getVideoTracks()
      if (tracks.length > 0) {
        const track = tracks[0]
        const settings = track.getSettings()
        console.log('ストリーム設定:', {
          facingMode: settings.facingMode,
          width: settings.width,
          height: settings.height,
          deviceId: settings.deviceId
        })
        
        // カメラの種別を判定
        const detectedFacingMode = settings.facingMode === 'environment' ? 'environment' : 'user'
        setCurrentFacingMode(detectedFacingMode)
        console.log('検出されたカメラ種別:', detectedFacingMode)
      }

      setStream(newStream)

      // Video要素の設定
      if (videoRef.current && newStream) {
        videoRef.current.srcObject = newStream
        
        // メタデータの読み込みを待つ
        const waitForMetadata = new Promise<void>((resolve, reject) => {
          const video = videoRef.current!
          const timeout = setTimeout(() => {
            reject(new Error('Video metadata loading timeout'))
          }, 5000)
          
          const onLoadedMetadata = () => {
            clearTimeout(timeout)
            video.removeEventListener('loadedmetadata', onLoadedMetadata)
            resolve()
          }
          
          if (video.readyState >= 1) {
            clearTimeout(timeout)
            resolve()
          } else {
            video.addEventListener('loadedmetadata', onLoadedMetadata)
          }
        })

        try {
          await waitForMetadata
          await videoRef.current.play()
          console.log('Video再生開始成功')
        } catch (playError) {
          console.error('Video再生エラー:', playError)
          // 再生エラーは致命的ではないので続行
        }
      }

    } catch (err) {
      console.error('カメラ起動エラー:', err)
      setError(err instanceof Error ? err.message : 'カメラの起動に失敗しました')
      setStream(null)
    } finally {
      setIsLoading(false)
    }
  }, [stream])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
    }
    setStream(null)
  }, [stream])

  const switchCamera = useCallback(async () => {
    const newFacingMode = currentFacingMode === 'environment' ? 'user' : 'environment'
    console.log(`カメラ切り替え: ${currentFacingMode} → ${newFacingMode}`)
    await startCamera(newFacingMode)
  }, [currentFacingMode, startCamera])

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return null

    const video = videoRef.current
    const canvas = canvasRef.current
    const context = canvas.getContext('2d')

    if (!context) return null

    // キャンバスサイズをビデオサイズに合わせる
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // ビデオフレームをキャンバスに描画
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Blobとして画像を取得
    return new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.8)
    })
  }, [])

  const analyzeImage = useCallback(async (imageBlob: Blob) => {
    setIsAnalyzing(true)
    setError('')
    
    try {
      const formData = new FormData()
      formData.append('image', imageBlob, 'captured-image.jpg')

      const response = await fetch('/api/analyze-image', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      setAnalysisResult(result)
      
      // デバッグ情報がある場合は表示フラグを設定
      if (result.debug && (result.debug.visionLabels?.length > 0 || result.debug.visionObjects?.length > 0)) {
        setShowDebugInfo(true)
      }
      
    } catch (err) {
      console.error('画像解析エラー:', err)
      setError(err instanceof Error ? err.message : '画像の解析に失敗しました')
    } finally {
      setIsAnalyzing(false)
    }
  }, [])

  const handleCapture = useCallback(async () => {
    try {
      const imageBlob = await captureImage()
      if (imageBlob) {
        await analyzeImage(imageBlob)
      }
    } catch (err) {
      console.error('キャプチャエラー:', err)
      setError('画像のキャプチャに失敗しました')
    }
  }, [captureImage, analyzeImage])

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // ファイルサイズチェック (10MB制限)
    if (file.size > 10 * 1024 * 1024) {
      setError('ファイルサイズが大きすぎます（10MB以下にしてください）')
      return
    }

    try {
      await analyzeImage(file)
    } catch (err) {
      console.error('ファイルアップロードエラー:', err)
      setError('ファイルのアップロードに失敗しました')
    }
  }, [analyzeImage])

  // コンポーネントマウント時にカメラを起動
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startCamera()
    } else {
      setError('このブラウザではカメラ機能がサポートされていません')
    }

    // クリーンアップ
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop())
      }
    }
  }, []) // startCameraを依存配列から除外してマウント時のみ実行

  // デバッグ情報の表示用
  const getDebugInfo = () => {
    if (!videoRef.current || !stream) return null
    
    const video = videoRef.current
    const tracks = stream.getVideoTracks()
    const track = tracks[0]
    const settings = track?.getSettings()
    
    return {
      videoWidth: video.videoWidth,
      videoHeight: video.videoHeight,
      readyState: video.readyState,
      currentTime: video.currentTime,
      paused: video.paused,
      trackCount: tracks.length,
      facingMode: settings?.facingMode || 'unknown',
      deviceId: settings?.deviceId || 'unknown'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* ヘッダー */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
            <h1 className="text-2xl font-bold text-center flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6" />
              Cafe Menu AI
            </h1>
            <p className="text-center text-blue-100 mt-2">
              メニューを撮影してAIが料理を提案します
            </p>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 m-4">
              <div className="flex">
                <AlertCircle className="w-5 h-5 text-red-400" />
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* カメラビュー */}
          <div className="p-6">
            <div className="relative">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
                {stream ? (
                  <div className="relative">
                    {/* カメラ状態表示 */}
                    <div className="absolute top-2 left-2 z-10 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
                      {currentFacingMode === 'environment' ? '📷 背面' : '🤳 フロント'}
                    </div>
                    
                    {/* カメラ切り替えボタン */}
                    <button
                      onClick={switchCamera}
                      className="absolute top-2 right-2 z-10 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all duration-200 hover:scale-110 hover:shadow-lg"
                      title={`${currentFacingMode === 'environment' ? 'フロント' : '背面'}カメラに切り替え`}
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full rounded-lg"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    {/* キャプチャボタン */}
                    <div className="mt-4 space-y-3">
                      <button
                        onClick={handleCapture}
                        disabled={isAnalyzing}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                      >
                        <Camera className="w-5 h-5" />
                        {isAnalyzing ? '解析中...' : '撮影して解析'}
                      </button>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isAnalyzing}
                        className="w-full bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
                      >
                        <Upload className="w-5 h-5" />
                        ファイルから選択
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12">
                    {isLoading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                        <p className="text-gray-600">カメラを起動中...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-4">
                        <Camera className="w-12 h-12 text-gray-400" />
                        <p className="text-gray-600">カメラの起動に失敗しました</p>
                        <button
                          onClick={() => startCamera()}
                          className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          再試行
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ファイル入力 */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>

            {/* 解析中の表示 */}
            {isAnalyzing && (
              <div className="mt-6 text-center">
                <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  AIが画像を解析中...
                </div>
              </div>
            )}

            {/* 解析結果の表示 */}
            {analysisResult && (
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-yellow-500" />
                  おすすめメニュー
                </h3>
                
                {analysisResult.recommendedDishes && analysisResult.recommendedDishes.length > 0 ? (
                  <div className="space-y-3">
                    {analysisResult.recommendedDishes.slice(0, 3).map((item: any, index: any) => {
                      // 安全な型変換
                      const dish: Dish = {
                        id: item.id || `dish-${index}`,
                        name: item.name || '不明な料理',
                        description: item.description || '',
                        price: item.price || 0,
                        category: item.category || 'その他',
                        keywords: safeArrayFromString(item.keywords || []),
                        visual_keywords: safeArrayFromString(item.visual_keywords || []),
                        image_url: item.image_url || null,
                        created_at: item.created_at || new Date().toISOString(),
                        updated_at: item.updated_at || new Date().toISOString()
                      }

                      return (
                        <div key={dish.id} className="bg-gray-50 rounded-lg p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{dish.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">{dish.description}</p>
                              <p className="text-lg font-semibold text-blue-600 mt-2">
                                ¥{formatPrice(dish.price)}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-600">
                      申し訳ございません。この画像に適したメニューが見つかりませんでした。
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      別の角度から撮影するか、他の料理を試してみてください。
                    </p>
                  </div>
                )}

                {/* デバッグ情報の表示 */}
                {showDebugInfo && analysisResult.debug && (
                  <div className="mt-6 bg-gray-50 rounded-lg p-4">
                    <button
                      onClick={() => setShowDebugInfo(!showDebugInfo)}
                      className="text-sm text-gray-600 hover:text-gray-800 mb-3 flex items-center gap-1"
                    >
                      <AlertCircle className="w-4 h-4" />
                      解析詳細を{showDebugInfo ? '非表示' : '表示'}
                    </button>
                    
                    {showDebugInfo && (
                      <div className="space-y-3 text-xs">
                        {analysisResult.debug.visionLabels && analysisResult.debug.visionLabels.length > 0 && (
                          <div>
                            <p className="font-medium text-gray-700">検出されたラベル:</p>
                            <p className="text-gray-600">
                              {analysisResult.debug.visionLabels.map((label: any) => 
                                `${label.description} (${Math.round(label.score * 100)}%)`
                              ).join(', ')}
                            </p>
                          </div>
                        )}
                        
                        {analysisResult.debug.visionObjects && analysisResult.debug.visionObjects.length > 0 && (
                          <div>
                            <p className="font-medium text-gray-700">検出されたオブジェクト:</p>
                            <p className="text-gray-600">
                              {analysisResult.debug.visionObjects.map((obj: any) => 
                                `${obj.name} (${Math.round(obj.score * 100)}%)`
                              ).join(', ')}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* デバッグ情報パネル */}
            {stream && videoRef.current && (
              <div className="mt-4">
                <button
                  onClick={() => setShowDebugInfo(!showDebugInfo)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {showDebugInfo ? 'デバッグ情報を非表示' : 'デバッグ情報を表示'}
                </button>
                
                {showDebugInfo && (
                  <div className="mt-2 bg-gray-100 rounded p-2 text-xs text-gray-600">
                    <pre>{JSON.stringify(getDebugInfo(), null, 2)}</pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* PWAインストールボタン */}
        <PWAInstall />
      </div>
    </div>
  )
}
