const { PrismaClient } = require('@prisma/client')

async function main() {
  const prisma = new PrismaClient()
  
  // サンプルデータの作成
  await prisma.menu.createMany({
    data: [
      {
        name: "ガトーショコラ",
        description: "濃厚なチョコレートケーキ",
        ingredients: "チョコレート,バター,卵,砂糖,小麦粉",
        allergens: "卵,小麦,乳",
        keywords: "chocolate,cake,dessert,チョコレート,ケーキ,デザート,スイーツ",
        imageUrls: "",
        price: 580,
        category: "デザート",
        active: true
      },
      {
        name: "カフェラテ",
        description: "エスプレッソとスチームミルクの絶妙なバランス",
        ingredients: "エスプレッソ,牛乳",
        allergens: "乳製品",
        keywords: "coffee,latte,milk,コーヒー,ラテ,ミルク,ドリンク",
        imageUrls: "",
        price: 450,
        category: "ドリンク",
        active: true
      },
      {
        name: "クラブハウスサンドイッチ",
        description: "チキン、ベーコン、レタス、トマトの贅沢サンドイッチ",
        ingredients: "パン,チキン,ベーコン,レタス,トマト,マヨネーズ",
        allergens: "小麦,卵,大豆",
        keywords: "sandwich,chicken,bacon,bread,サンドイッチ,チキン,ベーコン,パン",
        imageUrls: "",
        price: 780,
        category: "フード",
        active: true
      }
    ]
  })
  
  console.log('Database seeded successfully')
  await prisma.$disconnect()
}

main().catch(console.error)
