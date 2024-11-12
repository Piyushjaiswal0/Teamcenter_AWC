//The data var is loaded from structure.js

var libs = [];
var services = [];
var operations = [];

function searchlibs(name) {
    for(var i in libs){
        if(libs[i].name === name)
            return i;
    }
    return -1;
}

function searchServices(name){
    for(var i in services){
        if(services[i].name === name)
            return i;
    }
    return -1;
}

//service included because ops can share names
function searchOperations(name, service){
  if(service){
    for(var i in operations){
      if(operations[i].name === name && operations[i].service === service){
        return operations[i];
      }
    }
  }
  else{
    for(var i in operations){
      if(operations[i].name === name){
        return operations[i];
      }
    }
  }
}

var stack = [];
var primitives = {
  'bool': 'boolean',
  'char': 'char',
  'double': 'double',
  'float': 'float',
  'int': 'int',
  'void': 'null',
  'String': 'String',
  'boolean': 'boolean',
  'Date': 'Date',
  'IModelObject': 'IModelObject',
  'tag_t': 'tag_t'
}
function expandObject(obj) {
  if (typeof obj === 'object' && !Array.isArray(obj)) {
    for (var i in obj) {
      if (!primitives[obj[i].type.replace('[]', '')]) {
        if (stack.indexOf(obj[i].type.replace('[]', '')) !== -1) {
          obj[i].recursive = true;
        }
        else {
          obj[i].properties = getNamespaceProp(obj[i].type.replace('[]', ''));
          stack.push(obj[i].type.replace('[]', ''));
          var update = expandObject(obj[i].properties);
          if(update){
            obj[i].properties = update;
          }
          stack.pop();
        }
      }
    }
  }
  else if(obj.indexOf(';') !== -1){
    var newObj = {};
    newObj.$ = true;//used to mark as a map - $ is not valid name in xml
    newObj.key = {};
    newObj.key.type = obj.split(';')[0];
    if(!primitives[obj.split(';')[0].replace('[]', '')]){
      newObj.key.properties = getNamespaceProp(obj.split(';')[0].replace('[]', ''));
      expandObject(newObj.key.properties);
    }
    newObj.key.description = 'Key';
    newObj.value = {};
    newObj.value.type = obj.split(';')[1];
    if(!primitives[obj.split(';')[1].replace('[]', '')]){
      newObj.value.properties = getNamespaceProp(obj.split(';')[1].replace('[]', ''));
      expandObject(newObj.value.properties);
    }
    newObj.value.description = 'Value';
    return newObj;
  }
}

function removeExtraComma(str, insert){
  var i = str.lastIndexOf(',');
  if(!insert){
    insert = '';
  }
  return str.slice(0, i) + insert + str.slice(i+1);
}

function insertCloseBracket(str){
  var i = str.lastIndexOf(',');
  return str.slice(0, i) + ']' + str.slice(i);
}

var path = [];
function displayObject(obj){
  if(obj.$){
    //special handling for maps
    switch(obj.key.properties) {
      case 'int':
      case 'float':
      case 'String':
        var returnString =
          '{<br>'
        + '<div style="margin-left:10px;">'
        if(obj.value.properties){
          if(typeof obj.value.properties === 'string'){
            if(obj.value.type.indexOf('[]') !== -1){
              returnString +=
                  '<span>Sample' + obj.key.properties + 'Key</span>: "' + obj.value.properties + '[]"<br>';
            }
            else{
              returnString +=
                  '<span>Sample' + obj.key.properties + 'Key</span>: "' + obj.value.properties + '"<br>';
            }
          }
          //enum value type
          else if(Array.isArray(obj.value.properties)){
            if(obj.value.type.indexOf('[]') !== -1){
              returnString +=
                  '<span>Sample' + obj.key.properties + 'Key</span>: ' + JSON.stringify(obj.value.properties) + '<br>';
            }
            else{
              returnString +=
                  '<span>Sample' + obj.key.properties + 'Key</span>: "' + obj.value.properties[0] + '"<br>';
            }
          }
          //object value type
          else{
            if(obj.value.type.indexOf('[]') !== -1){
              returnString +=
                  '<span>Sample' + obj.key.properties + 'Key</span>:<br>'
                +  '[' + removeExtraComma( displayObject(obj.value.properties), ']' );
            }
            else{
              returnString +=
                  '<span>Sample' + obj.key.properties + 'Key</span>:<br>'
                +  removeExtraComma( displayObject(obj.value.properties) );
            }
          }
        }
        //primitive data type
        else{
          returnString +=
              '<span>Sample' + obj.key.properties + 'Key</span>: "' + obj.value.type + '"<br>';
        }
        returnString +=
          '</div>'
        + '},<br>'
        return returnString;;
      case 'IModelObject':
        var returnString =
          '[<br>'
        + '<div style="margin-left:10px;">'
        + '["SampleModelObjectKey1"],<br>';
        if(obj.value.properties){
          if(typeof obj.value.properties === 'string'){
            if(obj.value.type.indexOf('[]') !== -1){
              returnString += '["' + obj.value.properties + '[]"]<br>';
            }
            else{
              returnString += '["' + obj.value.properties + '"]<br>';
            }
          }
          else if(Array.isArray(obj.value.properties)){
            if(obj.value.type.indexOf('[]') !== -1){
              returnString += '[' + JSON.stringify(obj.value.properties) + ']<br>';
            }
            else{
              returnString += '["' + obj.value.properties[0] + '"]<br>';
            }
          }
          else{
            if(obj.value.type.indexOf('[]') !== -1){
              returnString +=
              '[[' + removeExtraComma( displayObject(obj.value.properties), ']]' );
            }
            else{
              returnString += '[' + removeExtraComma( displayObject(obj.value.properties) ) + ']';
            }
          }
        }
        else{
          returnString +=
              '["' + obj.value.type + '"]<br>';
        }
        returnString +=
            '</div>'
          + '],<br>';
        return returnString;
      default:
        console.log('Unknown key type' + obj.key.properties);
        return '';
    }
  }
  //only reached on initial call - request or response is a primitive
  else if(typeof obj !== 'object'){
    return '"'+obj+'",<br>';//leave extra comma because caller expects it
  }
  //only input or output is a enum - probably never happens
  else if(Array.isArray(obj)){
    return '"' + obj[0] + '"';
  }
  else{
    var returnString =
      '{<br>'
    + '<div style="margin-left:10px;">'
    for(var i in obj){
      path.push(i);

      if(obj[i].properties){
        if(typeof obj[i].properties === 'string'){
          if(obj[i].type.indexOf('[]') !== -1){
            returnString +=
                '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>: "' + obj[i].properties + '[]",<br>';
          }
          else{
            returnString +=
                '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>: "' + obj[i].properties + '",<br>';
          }
          returnString +=
              '<div style="display:none" class="keyInfoDiv" id="'+path.join('.')+'" >'
            + '<b>Type</b>: ' + obj[i].type + '<br>'
            + '<b>Description</b>: ' + obj[i].description + '<br>'
            + '</div>'
        }
        else if ( Array.isArray(obj[i].properties) ){
          if(obj[i].type.indexOf('[]') !== -1){
            returnString +=
                '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>: '
              + JSON.stringify(obj[i].properties) + ',<br>';
          }
          else{
            returnString +=
                '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>: '
              + '"' + obj[i].properties[0] + '",<br>';
          }
          returnString +=
              '<div style="display:none" class="keyInfoDiv" id="'+path.join('.')+'" >'
            + '<b>Type</b>: ' + obj[i].type + '<br>'
            + '<b>Description</b>: ' + obj[i].description + '<br>';

          if ( Array.isArray(obj[i].properties) ){
            returnString += '<b>Enum values</b>: ' + JSON.stringify(obj[i].properties) + '<br>'
          }

          returnString += '</div>';

        }
        else{
          if(obj[i].type.indexOf('[]') !== -1){
            returnString +=
                '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>:<br>'
              + '<div style="display:none" class="keyInfoDiv" id="'+path.join('.')+'" >'
              + '<b>Type</b>: ' + obj[i].type + '<br>'
              + '<b>Description</b>: ' + obj[i].description + '<br>'
              + '</div>'
              + '[' + insertCloseBracket( displayObject(obj[i].properties) );
          }
          else{
            returnString +=
                '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>:<br>'
              + '<div style="display:none" class="keyInfoDiv" id="'+path.join('.')+'" >'
              + '<b>Type</b>: ' + obj[i].type + '<br>'
              + '<b>Description</b>: ' + obj[i].description + '<br>'
              + '</div>'
              +  displayObject(obj[i].properties);
          }
        }
      }
      else{
        returnString +=
            '<span style="color:#006487;cursor:pointer;" onclick="showDocs(\''+ path.join('.') + '\')">' + i + '</span>: "' + obj[i].type + '",<br>'
            + '<div style="display:none" class="keyInfoDiv" id="'+path.join('.')+'" >'
            + '<b>Type</b>: ' + obj[i].type + '<br>'
            + '<b>Description</b>: ' + obj[i].description + '<br>'
            + '</div>';
      }

      path.pop();
    }
    returnString = removeExtraComma(returnString);
    returnString +=
      '</div>'
    + '},<br>'
    return returnString;;
  }
}

function showDocs(id){
  if(document.getElementById(id).style.display === 'none'){
    document.getElementById(id).style.display = 'block'
  }
  else{
    document.getElementById(id).style.display = 'none';
  }
}

function getNamespaceProp(path) {
  var inits = path.split('::');
  var temp = data;
  while (inits.length > 0) {
    var index = inits.shift();
    temp = temp[index];
    if (!temp) {
      console.log('Property missing: ' + path);
      return null;
    }
  }
  return JSON.parse(JSON.stringify(temp));
}

function addOperation(lib, service, year, op, opObj, internal, template){

  year = year.slice(1).replace('_', '-');

  //lib
  if(searchlibs(lib) === -1){
    libs.push({
      name: lib,
      operations: [op]
    });
  }
  else {
    libs[searchlibs(lib)].operations.push(op);
  }
  //service
  if(searchServices(service + ' - ' + year) === -1){
    services.push({
      name: service + ' - ' + year,
      lib: lib,
      operations: [op]
    });
  }
  else{
    services[searchServices(service + ' - ' + year)].operations.push(op);
  }
  //Operation
  var url = lib + '-' + year + '-' + service + '/' + op;
  if(internal){
    var url = 'Internal-' + url;
  }

  var include = template + '.Soa.' + lib + '._' + year.replace('-', '_') + '.' + service + '.' + op;

  var newOp = {
    lib: lib,
    service: service + ' - ' + year,
    serviceStub: service,
    year: year,
    name: op,
    url: url,
    include: include,
    description: opObj.description,
    input: opObj.input,
    output: opObj.output
  }
  if(Array.isArray(opObj)){
    newOp.input = opObj;
    newOp.output = '';
  }

  // expand all objects immediately - much slower but makes object inputs and outputs searchable
  // expandObject(newOp.input);
  // expandObject(newOp.output);

  operations.push(newOp);
}

for(var template in data){
  for(var type in data[template]){
    if(type === 'Soa'){
      for(var lib in data[template][type]){
        if(lib !== 'Internal'){
          for(var year in data[template][type][lib]){
            for(var service in data[template][type][lib][year]){
              for(var op in data[template][type][lib][year][service]){
                if(op[0] === op[0].toLowerCase() && isNaN(op)){
                  var addOp = data[template][type][lib][year][service][op];
                  addOperation(lib, service, year, op, addOp, false, template);
                }
              }
            }
          }
        }
      }
      for(var lib in data[template][type].Internal){
        for(var year in data[template][type].Internal[lib]){
          for(var service in data[template][type].Internal[lib][year]){
            for(var op in data[template][type].Internal[lib][year][service]){
              if(op[0] === op[0].toLowerCase() && isNaN(op)){
                var addOp = data[template][type].Internal[lib][year][service][op];
                addOperation(lib, service, year, op, addOp, true, template);
              }
            }
          }
        }
      }
    }
  }
}

//for sorting objects by name
function nameCmp(a, b){
  if(a.name < b.name)
      return -1
  if(a.name > b.name)
      return 1;
  if(a.year && b.year){
    if(a.year < b.year)
      return -1;
    if(a.year > b.year)
      return 1;
  }
  return 0
}

//sort alphabetically by name
libs.sort(nameCmp);
services.sort(nameCmp);
operations.sort(nameCmp);

/////////////////////////////////  CSS Helper Stuff ///////////////////////////////

function resizeList(){
  document.getElementById('filterPanel').style.height = window.innerHeight - 45 + 'px';
  document.getElementById('opList').style.height = window.innerHeight - 55 + 'px';
  document.getElementById('operationDisplay').style.height = window.innerHeight - 10 + 'px';
  document.getElementById('libList').style.height = (window.innerHeight - 180) / 2 + 'px';
  document.getElementById('svcList').style.height = (window.innerHeight - 180) / 2 + 'px';

  //Returns user to specific state.  Only runs on initial module load
  if(window.location.hash){
    var locations = window.location.hash.substring(1).split(';');
    var operation = '';
    var service = '';
    var lib = '';
    for(var i in locations){
      var name = locations[i].split('=')[0];
      var value = locations[i].split('=')[1];
      if(name === 'lib'){
        lib = value;
      }
      if(name === 'service'){
        service = value;
      }
      if(name === 'operation'){
        operation = value;
      }
    }
    if(lib){
      selectedLib = lib;
    }
    if(service){
      selectedService = service;
    }
    if(operation){
      if(searchOperations(operation, service)){
          updateDisplay(searchOperations(operation, service));
      }
    }
  }

  rerender();
}
window.onresize = resizeList;

var selectedLib = '';
var selectedService = '';
var selectedOperation = '';
var searchTerm = '';

function setSearchTerm(term){
  searchTerm = term;
  rerender();
}

function setLib(lib){
  selectedLib = lib;
  updateHash('lib', lib);
  if(selectedOperation && lib){
    if(selectedOperation.lib !== lib){
      resetOperation();
    }
  }
  rerender();
}

function setService(svc){
  selectedService = svc;
  updateHash('service', svc);
  if(selectedOperation && svc){
    if(selectedOperation.service !== svc){
      resetOperation();
    }
  }
  rerender();
}

function updateDisplay(operation) {
  selectedOperation = operation;
  expandObject(operation.input);
  expandObject(operation.output);
  document.getElementById('opName').innerHTML = operation.name;
  document.getElementById('opDesc').innerHTML = 'Description: <br><span style="color:#000">' + operation.description + '</span>';
  document.getElementById('opLib').innerHTML = 'Library: <span style="color:#000">' + operation.lib + '</span>';
  document.getElementById('opService').innerHTML = 'Service: <span style="color:#000">' + operation.serviceStub + '</span>';
  document.getElementById('opYear').innerHTML = 'Year: <span style="color:#000">' + operation.year + '</span>';
  document.getElementById('opUrl').innerHTML = 'Url: <span style="color:#000">' + operation.url + '</span>';
  document.getElementById('opInclude').innerHTML = 'Soa Dependency Inclusion: <span style="color:#000">"' + operation.include + '"</span>';
  var opInStr = removeExtraComma( displayObject(operation.input) );
  var opOutStr = removeExtraComma( displayObject(operation.output) );
  document.getElementById('opRequest').innerHTML = 'Request: <div style="color:#000;font-family:monospace;">' + opInStr + '</div>';
  document.getElementById('opResponse').innerHTML = 'Response: <div style="color:#000;font-family:monospace;">' + opOutStr + '</div>';
  updateHash('operation', operation.name);
  rerender();
}

function resetOperation() {
  document.getElementById('opName').innerHTML = 'Name: ';
  document.getElementById('opDesc').innerHTML = 'Description: ';
  document.getElementById('opLib').innerHTML = 'Library: ';
  document.getElementById('opService').innerHTML = 'Service: ';
  document.getElementById('opYear').innerHTML = 'Year: ';
  document.getElementById('opUrl').innerHTML = 'Url: ';
  document.getElementById('opInclude').innerHTML = 'Soa Dependency Inclusion: ';
  document.getElementById('opRequest').innerHTML = 'Request: ';
  document.getElementById('opResponse').innerHTML = 'Response: ';
  selectedOperation = '';
  updateHash('operation', '');
  rerender();
}

function updateHash(varName, newValue) {
  if(window.location.hash.substring(1)){
    var locations = window.location.hash.substring(1).split(';');
    var values = [];
    for(var i in locations){
      values.push(locations[i].split('=')[0]);
      values.push(locations[i].split('=')[1]);
    }
    var i = values.indexOf(varName);
    if(i !== -1){
      values[i+1] = newValue;
      for(var i in locations){
        locations[i] = values[2*i] + '=' + values[2*i+1];
      }
      window.location.hash = '#' + locations.join(';');
    }
    else {
      window.location.hash += ';' + varName + '=' + newValue;
    }
  }
  else {
    window.location.hash = '#' + varName + '=' + newValue;
  }
}

function searchChange(e){
  rerender();
}

function removeAllChildNodes(parent) {
  while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
  }
}

function replaceWithSpaces(str){
  return str.replaceAll("%20", " ");
}

function searchInputChange(val){
  setSearchTerm(val);
  rerender();
}

function rerender(){

  searchTerm = searchTerm.trim();

  if(searchTerm.length==0){
    document.getElementById("searchInput").value = "";
  }

  if(selectedLib){
    document.getElementById("libTitle").classList.add("bold")
  }else{
    document.getElementById("libTitle").classList.remove("bold")
  }

  if(selectedService.length>0){
    document.getElementById("svcTitle").classList.add("bold")
  }else{
    document.getElementById("svcTitle").classList.remove("bold")
  }

  if(searchTerm.length>0){
    document.getElementById("searchTitle").classList.add("bold")
  }else{

    document.getElementById("searchTitle").classList.remove("bold")
  }

  if(selectedOperation){
    document.getElementById("opTitle").classList.add("bold")
  }else{
    document.getElementById("opTitle").classList.remove("bold")
  }

  removeAllChildNodes(document.querySelector("#libList"))
  removeAllChildNodes(document.querySelector("#svcList"))
  removeAllChildNodes(document.querySelector("#opList"))

  // render new items
  var operationSearchResults = [];

  operations.forEach(function(op){
    const node = document.createElement("li");
    node.classList.add("cellListItem");
    node.id = op.url;
    const innerDivNode = document.createElement("div");
    innerDivNode.classList.add("cellListCellTitle");
    innerDivNode.innerHTML = op.name;
    node.appendChild(innerDivNode);

    const innerDivLabel = document.createElement("label");
    innerDivLabel.classList.add("cellListCellItemType");
    innerDivLabel.classList.add("small");

    innerDivLabel.innerHTML = op.url;
    node.appendChild(innerDivLabel);

    node.onclick = function(){
      updateDisplay(op);
    }

    if(selectedOperation == op){
      node.classList.add("cellListItemSelected");
    }

    let shouldAppendNode = false;

    if(selectedLib.length>0){
      if(selectedService.length>0){
        if(selectedLib==op.lib && replaceWithSpaces(selectedService)==op.service){
          shouldAppendNode = true;
        }else{
          shouldAppendNode = false;
        }
      }else{
        if(selectedLib==op.lib){
          shouldAppendNode = true;
        }else{
          shouldAppendNode = false;
        }
      }
    }else{
      if(selectedService.length>0){
        if(replaceWithSpaces(selectedService)==op.service){
          shouldAppendNode = true;
        }else{
          shouldAppendNode = false;
        }
      }else{
        shouldAppendNode = true;
      }
    }

    if(searchTerm.length>0){
      if(JSON.stringify(op).toLowerCase().includes(searchTerm.toLowerCase())){
        shouldAppendNode = true;
        if(selectedLib.length>0){
          if(selectedService.length>0){
            // both library and service filter
            if(op.lib==replaceWithSpaces(selectedLib)&&op.service==replaceWithSpaces(selectedService)){
             shouldAppendNode = true;
            }else{
              shouldAppendNode = false;
            }
          }else{
            // library filter
            if(op.lib==replaceWithSpaces(selectedLib)){
              shouldAppendNode = true;
            }else{
               shouldAppendNode = false;
            }
          }
        }else{
          if(selectedService.length>0){
            // service filter
            if(op.service==replaceWithSpaces(selectedService)){
              shouldAppendNode = true;
            }else{
              shouldAppendNode = false;
            }
          }else{
            // no extra filters
            shouldAppendNode = true;
          }
        }
      }else{
        shouldAppendNode = false;
      }
    }

    if(shouldAppendNode){
      if(services.filter((svc)=>svc.name==op.service&&svc.lib==op.lib).length>0){
        operationSearchResults.push(op);
      }
      document.querySelector("#opList").appendChild(node);
    }
  });

  services.forEach(function(svc){
    const node = document.createElement("li");
    node.classList.add("filterNameLabel");
    node.innerHTML = svc.name;
    node.onclick = function(){setService(svc.name)};
    // if(selectedService==svc.name){
    //   node.classList.add("bold");
    // }
    let shouldAppendNode = false;

    if(selectedService.length>0){
      if(replaceWithSpaces(selectedService) == svc.name){
        if(selectedLib.length>0){
          if(replaceWithSpaces(selectedLib)==svc.lib){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }else{
          shouldAppendNode = true;
        }
      }else{
        if(selectedLib.length>0){
          if(replaceWithSpaces(selectedLib)==svc.lib){
            shouldAppendNode = false;
          }else{
            shouldAppendNode = false;
          }
        }else{
          shouldAppendNode = false;
        }
      }
    }else{
      if(selectedLib.length>0){
        if(replaceWithSpaces(selectedLib)==svc.lib){
          shouldAppendNode = true;
        }else{
          shouldAppendNode = false;
        }
      }else{
        shouldAppendNode = true;
      }
    }

    if(searchTerm.length>0){
      if(selectedLib.length>0){
        if(selectedService.length>0){
          // both library and service filter
          if(svc.name==replaceWithSpaces(selectedService)){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }else{
          // library filter
          if(svc.lib==replaceWithSpaces(selectedLib) && operationSearchResults.filter((ops)=>ops.service==svc.name).length>0){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }
      }else{
        if(selectedService.length>0){
          // service filter
          if(svc.name==replaceWithSpaces(selectedService)){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }else{
          // no extra filters
          if(operationSearchResults.filter((ops)=>ops.service==svc.name).length>0){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }
      }
    }

    if(shouldAppendNode){
      document.querySelector("#svcList").appendChild(node);
    }
  });

  libs.forEach(function(lib){
    const node = document.createElement("li");
    node.classList.add("filterNameLabel");
    node.innerHTML = lib.name;
    node.onclick = function(){setLib(lib.name)};
    // if(replaceWithSpaces(selectedLib)==lib.name){
    //   node.classList.add("bold");
    // }
    let shouldAppendNode = false;
    if(selectedLib.length>0){
      if(replaceWithSpaces(selectedLib)==lib.name){
        shouldAppendNode = true;
      }
    }else{
      if(selectedService.length>0){
        let selectedServiceObject = services.filter((s)=>s.name == replaceWithSpaces(selectedService));
        if(selectedServiceObject.length>0){
          if(selectedServiceObject[0].lib == lib.name){
            shouldAppendNode = true;
          }
        }
      }else{
        shouldAppendNode = true;
      }
    }

    if(searchTerm.length>0){
      if(selectedLib.length>0){
        if(selectedService.length>0){
          // both library and service filter
          if(lib.name == replaceWithSpaces(selectedLib)){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false
          }
        }else{
          // library filter
          if(lib.name == replaceWithSpaces(selectedLib)){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false
          }
        }
      }else{
        if(selectedService.length>0){
          // service filter
          let libOfService = services.filter((svc)=>svc.name==replaceWithSpaces(selectedService))[0]['lib'];
          if(lib.name == libOfService){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }else{
          // no extra filters
          if(operationSearchResults.filter((ops)=>ops.lib==lib.name).length>0){
            shouldAppendNode = true;
          }else{
            shouldAppendNode = false;
          }
        }
      }
    }

    if(shouldAppendNode){
      document.querySelector("#libList").appendChild(node);
    }
  });
}
