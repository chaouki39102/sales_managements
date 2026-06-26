لحد الان عند الضغط على طباعة تجريبية تظهر صفحة فارغة للطباعة بيضاء ثانيا المعلومات الظاهرة في المعاينة قم بجلب معلومات المؤسسة الحالية او اضف حقول لتغييرها مثلا اسم المحل العنوان الهاتف او اجعل الخيار ان المستخدم يقوم بكتابتها في الحقل وان كان الحقل فارغ سوف يقوم بجلبها من معلومات المؤس
لحد الان عند الضغط على طباعة تجريبية تظهر صفحة فارغة للطباعة بيضاء ثانيا المعلومات الظاهرة في المعاينة قم بجلب معلومات المؤسسة الحالية او اضف حقول لتغييرها مثلا اسم المحل العنوان الهاتف او اجعل الخيار ان المستخدم يقوم بكتابتها في الحقل وان كان الحقل فارغ سوف يقوم بجلبها من معلومات المؤس
Now I have the full picture. Company data is available via useCurrentCompany() hook (calls GET /api/v1/companies/current), which returns full company info (name, nif, nis, rc, phone, address, avatar, activity/ai).
My plan:
1. Add editable company info override fields to the template type
2. Add a "معلومات الشركة" section with editable fields in HeaderSection
3. Fetch company data in PrintSettingsPage via useCurrentCompany()
4. Pass it to ReceiptPreview; use override → template field → API data → mock fallback
→Read resources\js\pages\settings\print-settings\types.ts [offset=41, limit=70]
+ Thought: 747ms
← Edit resources\js\pages\settings\print-settings\types.ts
showArticle:       boolean;
companyInfoAlign:  AlignOption;
companyInfoFontSize: number;
