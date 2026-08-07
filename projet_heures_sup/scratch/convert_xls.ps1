$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false

$workbook = $excel.Workbooks.Open("C:\Users\pc\Desktop\projet_heures_sup\GID_MODELE.xls")
$workbook.SaveAs("C:\Users\pc\Desktop\projet_heures_sup\GID_MODELE.xlsx", 51) # 51 = xlOpenXMLWorkbook
$workbook.Close()
$excel.Quit()
[System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
