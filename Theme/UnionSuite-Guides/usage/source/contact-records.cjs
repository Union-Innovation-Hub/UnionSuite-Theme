// Fictional reference data only. Used by the standalone mockup and guide galleries.
const workplace='Stark Enterprise — Melbourne';
const delegates=[
 ['Adam Phillips','Delegate','',''],
 ['Andrew Newnham','Delegate','andrew.newnham@example.org','0400 000 102'],
 ['Christina Zerk','Delegate','christina.zerk@example.org',''],
 ['Morgan Taylor','Delegate','','0400 000 104'],
 ['Alex Morgan','Delegate','alex.morgan@example.org','0400 000 105','RMIT — Melbourne'],
 ['Peter Williams','Delegate coordinator','peter.williams@example.org','0400 000 106'],
 ['Charlotte Alexander-Montgomery','Delegate','charlotte.alexander-montgomery@example.org','0400 000 107']
];
const organisers=[
 ['Allie Finnegan','','','0400 000 201'],
 ['Alex Keaton','','alex.keaton@example.org',''],
 ['Allison Moore','Region','allison.moore@example.org','0400 000 203'],
 ['Brian Murphy','General','brian.murphy@example.org','0400 000 204'],
 ['Andrew Newnham','General','andrew.newnham@example.org',''],
 ['Jamie Collins','Region','',''],
 ['Peter Rogers','General','','0400 000 207'],
 ['Al Soria','','al.soria@example.org','']
];
function records(rows,id){return rows.map(([name,role,email,phone,work=workplace],index)=>({
 ContactName:name,ContactId:String((id==='delegates'?101000:102000)+index),ContactUrl:'#'+id+'-contact-'+index,
 RoleLabel:role,RoleColour:role==='Delegate coordinator'?'#5B3F86':role==='Delegate'?'#DBEAFE':role==='Region'?'#FBEADA':'',WorkplaceName:work,WorkplaceUrl:'#'+id+'-workplace-'+index,Email:email,Phone:phone
}));}
module.exports={delegates:records(delegates,'delegates'),organisers:records(organisers,'organisers')};
