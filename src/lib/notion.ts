import { Client } from '@notionhq/client'

export const notion = new Client({
  auth: process.env.NOTION_TOKEN,
})

export const DISHES_DATABASE_ID = process.env.NOTION_DISHES_DATABASE_ID!

// Notionプロパティの型定義
export interface NotionDishProperties {
  Name: { title: Array<{ text: { content: string } }> }
  NameEn: { rich_text: Array<{ text: { content: string } }> }
  Price: { number: number | null }
  Category: { select: { name: string } | null }
  Description: { rich_text: Array<{ text: { content: string } }> }
  ChefComment: { rich_text: Array<{ text: { content: string } }> }
  Recommendation: { rich_text: Array<{ text: { content: string } }> }
  PairingSuggestion: { rich_text: Array<{ text: { content: string } }> }
  Ingredients: { multi_select: Array<{ name: string }> }
  Allergens: { multi_select: Array<{ name: string }> }
  Keywords: { multi_select: Array<{ name: string }> }
  VisualKeywords: { multi_select: Array<{ name: string }> }
  Available: { checkbox: boolean }
  Seasonal: { checkbox: boolean }
  Popular: { checkbox: boolean }
  Images: { files: Array<any> }
  Calories: { number: number | null }
}
