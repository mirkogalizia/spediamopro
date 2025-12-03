#!/bin/bash

API_URL="https://spediamopro.vercel.app/api/shopify2/catalog/assign-blanks-single"

echo "🚀 Fetching product IDs..."

RESPONSE=$(curl -s "$API_URL")
PRODUCT_IDS=$(echo $RESPONSE | grep -o '"productIds":\[[^]]*\]' | sed 's/"productIds":\[//;s/\]//' | tr ',' '\n' | tr -d '"')

TOTAL=$(echo "$PRODUCT_IDS" | wc -l | tr -d ' ')
CURRENT=0
TOTAL_PROCESSED=0
TOTAL_SKIPPED=0

echo "📦 Found $TOTAL products to process"
echo ""

for PRODUCT_ID in $PRODUCT_IDS; do
  CURRENT=$((CURRENT + 1))
  
  echo "[$CURRENT/$TOTAL] Processing product $PRODUCT_ID..."
  
  RESULT=$(curl -s -X POST "$API_URL" \
    -H "Content-Type: application/json" \
    -d "{\"productId\": \"$PRODUCT_ID\"}")
  
  PROCESSED=$(echo $RESULT | grep -o '"processed":[0-9]*' | cut -d':' -f2)
  SKIPPED=$(echo $RESULT | grep -o '"skipped":[0-9]*' | cut -d':' -f2)
  
  TOTAL_PROCESSED=$((TOTAL_PROCESSED + PROCESSED))
  TOTAL_SKIPPED=$((TOTAL_SKIPPED + SKIPPED))
  
  echo "   ✅ Processed: $PROCESSED, Skipped: $SKIPPED"
  echo "   📊 Total: $TOTAL_PROCESSED processed, $TOTAL_SKIPPED skipped"
  echo ""
  
  sleep 0.5
done

echo ""
echo "🎉 COMPLETATO!"
echo "📊 Totale: $TOTAL_PROCESSED processed, $TOTAL_SKIPPED skipped"
