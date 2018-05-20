import Simulation from './Simulation'
import Ui from './Ui'
import { isWebGlSupported } from './utils'

if (!isWebGlSupported()) {
  Ui.showWebGLError()
}
else {
  Simulation.init()
  Simulation.start()
}
