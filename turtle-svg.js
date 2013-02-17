window.onload = function(){


  // get rid of hard coded urls
  // var baseURL = location.href.replace(/\/[^\/]*(#.*)?$/,"/"); // strip filename + hash
  var baseURL = location.href.replace(/\/?#.*/, ""); // strip hash
  
  //var currentWorker = "turtle-svg-worker.js";
  var currentWorker = "worker-stitch-turtle-svg.js";

  ace.config.set("workerPath", "js");
  var editor = ace.edit("editor");
  editor.setTheme("ace/theme/monokai");
  var session = editor.getSession();
  session.setMode("ace/mode/javascript");
  session.setTabSize(2);

  var programMenu = document.getElementById("program");
  var applyButton = document.getElementById("apply");
  var autoCheck = document.getElementById("auto");
  var helpButton = document.getElementById("show-help");
  var exportButton = document.getElementById("export");
  var exportPNGButton = document.getElementById("export-png");
  var rightColumn = document.getElementById("right-column");
  var link = document.getElementById("link");
  var shareLink = document.getElementById("share-link");
  var help = document.getElementById("help");
  var helpClose = document.getElementById("help-close");
  var svgContainer = document.getElementById("svg-container");
  var svgImage = document.getElementById("svg-image");
  var info = document.getElementById("info");
  var modeMenu = document.getElementById("mode");

  var testingCode;
  var testCodeStart;
  var svgLoadStart;

  var currentSVGCode = "";
  var currentSVGString = "";
  var currentSVGStrings = {};


  var currentCodeSaved = true;

  var worker;
  var workerBusy = false;
  var workerError = false;
  var loadingSVG = false;
  var createdSVG = false;

  var labels = {
    run: "Run",
    cancel: "Abort",
    loading: "Busy"
  };

  var programURLs = {
    laser: "http://forresto.github.com/turtle-svg/",
    crafty: "http://bitcraftlab.github.com/turtlecraft/"
  };

  var infos = {
    syntaxError: "Check your Syntax!",
    outputError: "FAIL.",
    runtimeError: "Runtime Error!",
    processing: "Calculating...",
    rendering: "Loading...",
    cancelled: "Aborted.",
    success: function(){
      var ltime, ctime;
      var round = function(x) { return Math.round(x/1000*100)/100 };
      ltime = Date.now() - svgLoadStart;
      if(createdSVG) {
        ctime = svgLoadStart - testCodeStart;
        return "SVG created in " + round(ctime) + "s, loaded in " + round(ltime) + "s";
      } else {
        return "SVG updated in " + round(ltime) + "s";
      }    
    },
    clean: ""
  };

  var beforeLoading = function() {
    info.innerHTML = infos.rendering;
    applyButton.innerHTML = labels.loading;
    applyButton.disabled = true;
    svgLoadStart = Date.now();
  };

  var afterLoading = function() {
    applyButton.innerHTML = labels.run;
    applyButton.disabled = false;
    info.innerHTML = workerError ? infos.outputError : infos.success();
  };

  var setupWorker = function(){

    if (worker) {
      worker.terminate();
      applyButton.innerHTML = labels.run;
      info.innerHTML = infos.cancelled;
    }

    worker = new Worker(currentWorker);
    worker.onmessage = function(e) {
      workerError = (e.data === "");
      workerBusy = false;
      if (workerError){
        afterLoading();
      } else {
        beforeLoading();
        setSVG(e.data, afterLoading);      
      }

    };
    worker.onerror = function(e) {
      info.innerHTML = infos.runtimeError;
      workerError = true;
    };
    workerError = false;
    workerBusy = false;
  };

  // setupWorker();

  var testCode = function(){

    // don't do anything unless the SVG has finished loading.
    // otherwise things get real nasty.
    if(loadingSVG) {
      return;
    }
    if (!worker || workerBusy) {
      setupWorker();
    }
    if (worker && !workerBusy) {
      workerBusy = true;
      applyButton.innerHTML = labels.cancel;
      testCodeStart = Date.now();
      info.innerHTML = infos.processing;
      testingCode = editor.getValue();
      worker.postMessage(testingCode);
    }
  };

  var autoEval;
  var currentSVGMode;

  var getCurrentSVGMode = function() {
    var self = modeMenu;
    currentSVGMode = self.options[self.selectedIndex].value;
  }

  var getAutoEval = function() {
    autoEval = autoCheck.checked;
  }

  // init autoEval and currentSVGMode from the state of the form
  getAutoEval();
  getCurrentSVGMode();

  // leave the page but keep the code
  programMenu.onchange = function() {
    var program = this.options[this.selectedIndex].value;
    var currentCode = editor.getValue();
    var packed = encode( currentCode );
    window.location.href = programURLs[program] + "#code/" + packed;
  };

  autoCheck.onchange = function(){
    getAutoEval();
    if (autoEval) {
      testCode();
    }
  };

  modeMenu.onchange = function(){
    getCurrentSVGMode();
    beforeLoading();
    updateSVG(afterLoading);
  };

  applyButton.onclick = function(){
    if (worker && (workerBusy || workerError)) {
      // Restart borked worker
      setupWorker();
    } else {
      testCode();
    }
  };

  var jshintOK = function() {
    var annotations = editor.getSession().getAnnotations();
    for (var key in annotations) {
      if (annotations.hasOwnProperty(key)){
        return false;
      }
    }
    return true;
  };

  session.on("changeAnnotation", function(){
    // Eval it?
    if (jshintOK()) { 
      info.innerHTML = infos.clean;
      if (autoEval) {
        testCode();
      }
    } else {
      info.innerHTML = infos.syntaxError;
    }
  });

  // var buildSVG = function(info){
  //   var svgns = "http://www.w3.org/2000/svg";
  //   var svg = document.createElementNS(svgns, "svg");
  //   svg.setAttribute("id", "turtle-svg");
  //   svg.setAttribute("width", info.w);
  //   svg.setAttribute("height", info.h);
  //   for (var i=0; i<info.paths.length; i++) {
  //     var path = document.createElementNS(svgns, "path");
  //     path.setAttributeNS(null, "id", "turtle-path-"+i);
  //     path.setAttributeNS(null, "stroke", info.paths[i].stroke);
  //     path.setAttributeNS(null, "fill", "none");
  //     path.setAttributeNS(null, "d", info.paths[i].d);
  //     path.setAttributeNS(null, "vector-effect", "non-scaling-stroke");
  //     svg.appendChild(path);
  //   }
  // };

  window.URL = window.URL || window.webkitURL || window.mozURL || window.msURL || null;
  var svgBlobURL;
  var buildURL = function(svgString){
    if (window.URL && window.URL.createObjectURL) {
      if (svgBlobURL) {
        window.URL.revokeObjectURL(svgBlobURL);
      }
      var svgBlob = new Blob([svgString], { "type" : "image/svg+xml" });
      svgBlobURL = window.URL.createObjectURL(svgBlob);
      return svgBlobURL;
    } else {
      return "data:image/svg+xml,"+encodeURIComponent(svgString);
    }
  };

  var setSVG = function(message, cb_onload){
    currentSVGCode = message.code;
    currentSVGStrings = message.svg;
    createdSVG = true;
    updateSVG(cb_onload);
  };

  var updateSVG = function(cb_onload) {
    currentSVGString = currentSVGStrings[currentSVGMode];
    loadingSVG = true;
    svgImage.onload = function() {
      cb_onload();
      loadingSVG = false;
      createdSVG = false;
    };
    svgImage.src = buildURL(currentSVGString);
  };

  var helpShown = false;
  var toggleHelp = function(){
    helpShown = !helpShown;
    help.style.display = helpShown ? "block" : "none";
    rightColumn.scrollTop = helpShown ? help.offsetTop : 0;
  };
  helpButton.onclick = toggleHelp;
  helpClose.onclick = toggleHelp;

  /*
    Export options
  */

  exportButton.onclick = function(){
    if (!currentSVGString) { return; }

    var packed = encode( currentSVGCode );
    var perma = baseURL + '#code/' + packed;
    var comment = "<!--\n\n" +
      "Made with LASER TURTLE; here is editor and source: \n" + 
      perma + "\n\n" +
      currentSVGCode.replace(/\-\-/g,"- - ") + "\n\n" +
      "-->\n";
    var svgBlob = new Blob([comment, currentSVGString], { "type" : "image/svg+xml" });
    var svgBlobURL = window.URL.createObjectURL(svgBlob);
    if (svgBlobURL) {
      // FIXME this doesn't work in Safari
      window.open(svgBlobURL);
    } else {
      // Both of these crash Safari with 50000 points :-(
      // window.open("data:image/svg+xml;base64,"+window.btoa(comment+currentSVGString));
      window.open("data:image/svg+xml,"+encodeURIComponent(comment+currentSVGString));
    }
  };

  exportPNGButton.onclick = function(){
    if (!svgImage) { return; }

    var canvas = document.createElement("canvas");
    var context = canvas.getContext("2d");
    canvas.width = svgImage.width;
    canvas.height = svgImage.height;
    context.drawImage(svgImage, 0, 0);
    try {
      var pngDataURL = canvas.toDataURL();
      window.open( pngDataURL );
    } catch (error) {
      rightColumn.appendChild(canvas);
    }
  };


  /*
    Code saving and loading
  */

  session.on("change", function(){
    if (currentCodeSaved) {
      currentCodeSaved = false;
      document.title = "LASER TURTLE -- Turtle Graphics to SVG";
      history.pushState({title: document.title}, document.title, "#unsaved");
    }
  });

  shareLink.onclick = function() {
    this.select();
  };

  // Compress code for sharing 
  // With help from https://github.com/mrdoob/htmleditor
  var saveToURL = function(){
    currentCodeSaved = true;

    var currentCode = editor.getValue();
    var packed = encode( currentCode );
    shareLink.style.display = "inline";
    shareLink.value = baseURL + '#code/' + packed;
    var now = new Date();
    document.title = "Saved " + now.toLocaleTimeString() + " -- LASER TURTLE";
    // window.location.href = "#code/"+packed;
    var state = {
      title: document.title,
      code: currentCode
    };
    if (window.location.hash === "#unsaved") {
      history.replaceState(state, document.title, "#code/"+packed);
    } else {
      history.pushState(state, document.title, "#code/"+packed);
    }
  };
  link.onclick = function(){
    saveToURL();
    shareLink.select();
  };
  var decode = function ( string ) {
    return RawDeflate.inflate( window.atob( string ) );
  };
  var encode = function ( string ) {
    return window.btoa( RawDeflate.deflate( string ) );
  };

  var setEditorCode = function (code) {
    currentCodeSaved = false;
    editor.setValue(code, 1);
    currentCodeSaved = true;
  };

  var loadCodeFromHash = function(){
    if (window.location.hash.substr(0,5) === "#code") {
      try {
        var code = decode( window.location.hash.substr(6) );
        if (code !== editor.getValue()){
          var state = {
            title: document.title,
            code: code
          };
          history.replaceState(state, document.title, window.location.hash);
          setEditorCode(code);
          testCode();
        }
      } catch (e) {}
    }
  };

  window.onpopstate = function(e){
    if (e.state) {
      document.title = e.state.title;
      if (e.state.code !== undefined) {
        setEditorCode(e.state.code);
      }
    }
  };

  // See if code is set on load
  if ( window.location.hash ) {
    loadCodeFromHash();
  } else {
    // Default code
    testCode();
  }


  /*
    Key binding 
  */

  editor.commands.addCommand({
    name: 'saveToURL',
    bindKey: {win: 'Ctrl-S',  mac: 'Command-S'},
    exec: saveToURL
  });

  editor.commands.addCommand({
    name: 'applyCode',
    bindKey: {win: 'Ctrl-Return',  mac: 'Command-Return'},
    exec: testCode
  });


};
