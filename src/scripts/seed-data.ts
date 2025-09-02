import { supabaseAdmin } from '@/lib/supabase'

const sampleDishes = [
  {
    name: 'チーズケーキ',
    name_en: 'Cheese Cake',
    description: '濃厚でなめらかなクリームチーズを使用した当店自慢のデザートです',
    price: 520,
    category: 'デザート',
    chef_comment: '北海道産クリームチーズを使用した濃厚な味わいをお楽しみください。当店で一番人気のデザートです。',
    recommendation: '食後のデザートに最適です。甘さ控えめで上品な味わいです。',
    pairing_suggestion: 'ブレンドコーヒーや紅茶と相性抜群です',
    ingredients: ['クリームチーズ', '卵', '小麦粉', '砂糖', 'バター', 'バニラエッセンス'],
    allergens: ['乳製品', '卵', '小麦'],
    keywords: ['チーズケーキ', 'ケーキ', 'デザート', 'スイーツ'],
    nutritional_info: { calories: 350 },
    available: true,
    popular: true,
    seasonal: false,
    image_urls: []
  },
  {
    name: 'ブレンドコーヒー',
    name_en: 'Blend Coffee',
    description: '厳選された豆をブレンドした香り豊かなコーヒーです',
    price: 380,
    category: 'ドリンク',
    chef_comment: 'ブラジルとコロンビア産の豆を絶妙にブレンド。深い香りとまろやかな味わいが特徴です。',
    recommendation: 'モーニングやランチタイム、いつでもお楽しみいただけます。',
    pairing_suggestion: 'チーズケーキやクッキーとの相性が抜群です',
    ingredients: ['コーヒー豆（ブラジル産）', 'コーヒー豆（コロンビア産）'],
    allergens: [],
    keywords: ['コーヒー', 'ブレンド', 'ドリンク', 'カフェイン'],
    nutritional_info: { calories: 5 },
    available: true,
    popular: true,
    seasonal: false,
    image_urls: []
  },
  {
    name: 'クラブハウスサンドイッチ',
    name_en: 'Club House Sandwich',
    description: 'チキン、ベーコン、野菜をたっぷり挟んだボリューム満点のサンドイッチ',
    price: 890,
    category: 'フード',
    chef_comment: '新鮮な野菜とジューシーなチキン、カリカリベーコンの絶妙なハーモニーをお楽しみください。',
    recommendation: 'ランチタイムにぴったり。ボリューム満点で満足感があります。',
    pairing_suggestion: 'アイスコーヒーやレモネードとよく合います',
    ingredients: ['食パン', 'チキン', 'ベーコン', 'レタス', 'トマト', 'マヨネーズ'],
    allergens: ['小麦', '卵', '大豆'],
    keywords: ['サンドイッチ', 'チキン', 'ベーコン', 'ランチ'],
    nutritional_info: { calories: 650 },
    available: true,
    popular: false,
    seasonal: false,
    image_urls: []
  }
]

export async function seedDatabase() {
  try {
    console.log('🌱 サンプルデータの投入を開始します...')
    
    for (const dish of sampleDishes) {
      const { error } = await supabaseAdmin
        .from('dishes')
        .insert(dish)
      
      if (error) {
        console.error(`❌ ${dish.name} の投入に失敗:`, error)
      } else {
        console.log(`✅ ${dish.name} を追加しました`)
      }
    }
    
    console.log('🎉 サンプルデータの投入が完了しました')
  } catch (error) {
    console.error('❌ シードデータ投入エラー:', error)
  }
}

// スクリプトとして直接実行された場合
if (require.main === module) {
  seedDatabase()
}
