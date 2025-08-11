-- CreateTable
CREATE TABLE "Menu" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "ingredients" TEXT NOT NULL,
    "allergens" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "imageUrls" TEXT NOT NULL,
    "price" INTEGER,
    "category" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
