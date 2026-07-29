Diagnosis Summary
Step	Finding
1. API query	productsApi.list() with include: 'tva,unit,family,...' — relies on ProductResource for field list
2. ProductResource	✅ is_sold_by_weight IS in the response (confirmed via live HTTP request)
3. handleAddItem condition	v.product?.is_sold_by_weight && !packaging — !packaging was the blocker
4. Root cause	ProductCard.tsx:169 always calls onAdd(v, qty, activePkg) — even with 1 packaging. Product "نشاء فراك" has 1 packaging, so activePkg is always truthy → !packaging = false → weight modal never opens
5. Fix	Removed && !packaging — weight products ALWAYS open the weight modal when qty is undefined, regardless of packaging
Please hard-refresh (Ctrl+Shift+R) and test clicking the product again.