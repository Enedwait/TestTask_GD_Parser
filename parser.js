const sheetID = '1WjIxdMF0M3BgqmiO06X5MsDQFP8Zs6oovjy1oF8dGfA';
const baseURL = `https://docs.google.com/spreadsheets/d/${sheetID}/gviz/tq?`;
const sheetName = 'Balance';
// getting date and country table
const query_data = encodeURIComponent('Select A,B,C,D Where A <> \'\' Or B <> \'\' Or C <> \'\' Or D <> \'\'');
const url_data = `${baseURL}$sheet=${sheetName}&tq=${query_data}`;
// getting type table
const query_types = encodeURIComponent('Select F,G Where F <> \'\' Or G <> \'\'');
const url_types = `${baseURL}$sheet=${sheetName}&tq=${query_types}`;

document.addEventListener('DOMContentLoaded', init);

// Main function
async function init(){
    const json_data = await getJsodData(url_data);
    const json_types = await getJsodData(url_types);
    const arr_types = retrieveTypes(json_types);

    const balance = [];
    const cols_data = json_data["table"]["cols"];

    for (let index = 1; index < cols_data.length; index++) { 
        balanceCountry = new BalanceCountry(cols_data[index]["label"]);
        balance.push(balanceCountry);

        const biTemp = [];

        json_data["table"]["rows"].forEach(row => {                  
            const date = new Date(row["c"][0]["f"]);  
            const cell = row["c"][index];            
            if (cell != '' && cell != null && cell["v"] != '' && cell["v"] != null){                
                const biArray = cell["v"].trim().split(",");  

                biArray.forEach(bi => {
                    const bi0 = bi.trim();
                    if (!arr_types.includes(bi0)) // check whether the current line is a defined type; skip it otherwise
                        return;

                    currBI = new BalanceItem(bi0, date); 
                    if (biTemp.length == 0)
                        biTemp.push(currBI);                         
                    else {  
                        let added = false;
                        biTemp.every(item => {
                            if (item.equals(currBI)) {
                                item.addDay();
                                added = true;
                                return false;
                            }

                            return true;
                        }); 

                        if (!added)
                            biTemp.push(currBI);                             
                    }             
                });
            }

            for (let j = biTemp.length - 1; j >= 0; j--){
                if (biTemp[j].end_date.getTime() == date.getTime()){
                    biTemp[j].finalize();
                    balanceCountry.items.push(biTemp[j]);
                    biTemp.splice(j, 1);
                }                    
            }
        });
    }

    // compose final json object
    const json_result = {};
    balance.forEach(country => {
        json_result[`${country.name}_Balance`] = [];        
        country.items.forEach(item => {
            json_result[`${country.name}_Balance`].push(new BalanceItemDto(item));
        });
    })

    output(JSON.stringify(json_result));
}

// Outputs (displays) the specified data the desired way
function output(data){
    console.log(data);
    document.getElementById('output-id').innerHTML = `<p>${data}</p>`;
}

// Retrieves the json data out of the given Google Sheets URL
async function getJsodData(url){
    let json = null;
    await fetch(url)
    .then(res => res.text())
    .then(res => {
        const js0 = res.substring(47).slice(0, -2);
        json = JSON.parse(js0);        
    });
    return json;
}

// Retrieves the types of the monetization entities
function retrieveTypes(json_types) {
    let arr_types = [];

    json_types["table"]["rows"].forEach(row => {        
        row["c"].forEach(element => {
            arr_types.push(element["v"]);
        });
    });   

    return arr_types;
}

// This class represents the Balance Country object
class BalanceCountry {    
    name;
    items;

    constructor(name){
        this.name = name;
        this.items = [];
    }

    // Converts the given object to its string representation
    toString(){
        return this.name;
    }
}

// This class represents the Balance Item DTO
class BalanceItemDto {
    start_date;
    end_date;
    balance;

    constructor(balanceItem){
        this.balance = balanceItem.balance;
        this.start_date = balanceItem.formatDate(balanceItem.start_date);
        this.end_date = balanceItem.formatDate(balanceItem.end_date);
    }
}

// This class represents the Balance Item
class BalanceItem {
    start_date;
    end_date;
    balance;

    constructor(balance, start_date){
        this.balance = balance;
        this.start_date = start_date;
        this.end_date = start_date.addDays(1);
    }

    // Compares the current balance item with the specified one
    equals(balanceItem){
        return this.balance == balanceItem.balance;
    }

    // Adds a single day to the end date
    addDay(){
        this.end_date = this.end_date.addDays(1);
    }    

    // Converts the given object to its string representation
    toString(){
        return `${this.balance} [${this.formatDate(this.start_date)} - ${this.formatDate(this.end_date)}]`;
    }

    // Creates a formatted date string
    formatDate(date){
        return `${(date.getMonth()+1)}/${date.getDate()}/${date.getFullYear()}`;
    }
    
    // Finalizes balance item after all the parsing actions; makes the balance item complete and ready for export
    finalize(){ 
        this.end_date = this.end_date.addDays(-1);
    }
}

// Adds the specified amount of days to the specific Date
Date.prototype.addDays = function(days) {
    let date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}