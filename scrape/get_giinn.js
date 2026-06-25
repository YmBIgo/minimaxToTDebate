// https://www.shugiin.go.jp/internet/itdb_annai.nsf/html/statics/syu/1giin.htm
t = ""
Array.from(document.getElementsByTagName("tbody")[2].getElementsByTagName("tr")).forEach((a) => {
    td = a.getElementsByTagName("td");
    t += (td[0].textContent + "  " + td[1].textContent + "  " + td[2].textContent).replace(/\n/g, "").replace(/　/g, "") + "\n"
})
t

//https://www.sangiin.go.jp/japanese/joho1/kousei/giin/221/giin.htm
t = ""
Array.from(document.getElementsByTagName("tbody")[1].getElementsByTagName("tr")).forEach((a) => {
    td = a.getElementsByTagName("td");
    t += (td?.[0]?.textContent + "  " + td?.[1]?.textContent + "  " + td?.[2]?.textContent).replace(/\n/g, "").replace(/　/g, "") + "\n"
})
t