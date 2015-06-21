(function() {

  if (!Detector.webgl)
  {
    document.body.classList.add("no-ui");
    Detector.addGetWebGLMessage({id: "webgl-error"});
    return;
  }

  Simulation.init();
  Simulation.start();

})();