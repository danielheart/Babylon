import * as BABYLON from 'babylonjs'
import 'babylonjs-loaders'

const canvas = document.getElementById('right-world')
const canvasUp = document.getElementById('left-up-world')
const canvasLow = document.getElementById('left-low-world')
const engine = new BABYLON.Engine(canvas, true)
const engineUp = new BABYLON.Engine(canvasUp, true)
const engineLow = new BABYLON.Engine(canvasLow, true)

let upperJaw, lowerJaw, faceObj, faceObjCopy, upperJawCopy, lowerJawCopy
const facePositions = []
const teethPositions = []
let isAlign = false
const createScene = () => {
   const scene = new BABYLON.Scene(engine)

   // Add a light to the scene
   const light = new BABYLON.HemisphericLight(
      'light',
      new BABYLON.Vector3(0, 1, 0),
      scene,
   )
   const hemilight = new BABYLON.HemisphericLight(
      'ambientLight',
      new BABYLON.Vector3(0, 1, 0),
      scene,
   )
   hemilight.intensity = 0.2
   //Create an Arc Rotate Camera - aimed negative z this time
   const camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2,
      600,
      BABYLON.Vector3.Zero(),
      scene,
   )
   camera.attachControl(canvas, true)

   //Creation of a red material with alpha
   const material = new BABYLON.StandardMaterial('material', scene)
   material.backFaceCulling = false
   //simplify, and upon finishing set the material

   // Load model
   BABYLON.SceneLoader.ImportMesh('', 'upperJaw.stl', '', scene, (meshes) => {
      // Position the mesh
      upperJaw = meshes[0]
      upperJaw.material = material

      // 合并重复顶点
      upperJaw.forceSharedVertices()

      // 输出合并后的顶点数量
      console.log('合并后的顶点数量：' + upperJaw.getTotalVertices())

      // upperJaw.rotate(BABYLON.Axis.X, -Math.PI / 4, BABYLON.Space.LOCAL)
      // upperJaw.computeWorldMatrix()
      // const array = Array.from(upperJaw.getWorldMatrix().m)
      // console.log(array)
      // sendMatrix('upperjaw', array)

      //draggable upperJaw
      var pointerDragBehavior = new BABYLON.PointerDragBehavior({
         dragPlaneNormal: new BABYLON.Vector3(0, 0, 1),
      })

      upperJaw.addBehavior(pointerDragBehavior)
      // 添加拖动结束回调函数
      pointerDragBehavior.onDragEndObservable.add(function (eventData) {
         const array = Array.from(upperJaw.getWorldMatrix().m)
         upperJawCopy.setPivotMatrix(upperJaw.getWorldMatrix(), false)
         lowerJaw.setPivotMatrix(upperJaw.getWorldMatrix(), false)
         lowerJawCopy.setPivotMatrix(upperJaw.getWorldMatrix(), false)
         sendMatrix('upperjaw', array)
         sendMatrix('lowerjaw', array)
      })
   })
   BABYLON.SceneLoader.ImportMesh('', 'lowerJaw.stl', '', scene, (meshes) => {
      lowerJaw = meshes[0]
      lowerJaw.material = material
      lowerJaw.forceSharedVertices()
   })

   BABYLON.SceneLoader.ImportMesh('', 'smile.obj', '', scene, (meshes) => {
      faceObj = meshes[0]
      faceObj.material.backFaceCulling = false

      var scale = new BABYLON.Vector3(1, 1, -1)
      faceObj.scaling = scale
      resetMatrix(faceObj)

      //draggable upperJaw
      var pointerDragBehavior = new BABYLON.PointerDragBehavior({
         dragPlaneNormal: new BABYLON.Vector3(0, 0, 1),
      })

      faceObj.addBehavior(pointerDragBehavior)
      // 添加拖动结束回调函数
      pointerDragBehavior.onDragEndObservable.add(function (eventData) {
         // faceObj.computeWorldMatrix()
         const array = Array.from(faceObj.getWorldMatrix().m)
         // console.log(adjustTranslationMatrix(array))
         sendMatrix('face', array)
         setTimeout(function () {
            sendDetectTask()
         }, 20)
      })
   })
   return scene
}
let cameraLow
const createLowScene = () => {
   const scene = new BABYLON.Scene(engineLow)

   // Add a light to the scene
   const light = new BABYLON.HemisphericLight(
      'light',
      new BABYLON.Vector3(0, 1, 0),
      scene,
   )
   //Create an Arc Rotate Camera - aimed negative z this time
   cameraLow = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 2,
      Math.PI / 2,
      100,
      BABYLON.Vector3.Zero(),
      scene,
   )
   cameraLow.attachControl(canvas, true)

   //Creation of a red material with alpha
   const material = new BABYLON.StandardMaterial('material', scene)

   // Load model
   BABYLON.SceneLoader.ImportMesh('', 'upperJaw.stl', '', scene, (meshes) => {
      // Position the mesh
      upperJawCopy = meshes[0]
      upperJawCopy.material = material
      material.backFaceCulling = false

      // 合并重复顶点
      // meshes[0].forceSharedVertices()
   })
   BABYLON.SceneLoader.ImportMesh('', 'lowerJaw.stl', '', scene, (meshes) => {
      meshes[0].material = material
      // meshes[0].forceSharedVertices()
      lowerJawCopy = meshes[0]
   })

   return scene
}
const createUpScene = () => {
   const scene = new BABYLON.Scene(engineUp)

   // Add a light to the scene
   const light = new BABYLON.HemisphericLight(
      'light',
      new BABYLON.Vector3(0, 1, 0),
      scene,
   )
   //Create an Arc Rotate Camera - aimed negative z this time
   const camera = new BABYLON.ArcRotateCamera(
      'camera',
      -Math.PI / 1.8,
      Math.PI / 2,
      0,
      BABYLON.Vector3.Zero(),
      scene,
   )
   camera.attachControl(canvas, true)

   //Creation of a red material with alpha
   const material = new BABYLON.StandardMaterial('material', scene)

   BABYLON.SceneLoader.ImportMesh('', 'smile.obj', '', scene, (meshes) => {
      var scale = new BABYLON.Vector3(1, 1, -1)
      meshes[0].scaling = scale
      resetMatrix(meshes[0])
   })

   return scene
}

function resetMatrix(mesh) {
   // 更新物体的世界矩阵
   mesh.computeWorldMatrix(true)

   // 计算将当前世界矩阵转换为单位矩阵的变换矩阵
   const matrix = mesh.getWorldMatrix()

   // 应用变换矩阵，将物体的世界矩阵设置为单位矩阵
   mesh.bakeTransformIntoVertices(matrix)

   // 将物体的位置、旋转和缩放重置为之前保存的数值
   mesh.position = new BABYLON.Vector3(0, 0, 0)
   mesh.rotationQuaternion = new BABYLON.Quaternion(0, 0, 0, 1)
   mesh.scaling = new BABYLON.Vector3(1, 1, 1)

   mesh.computeWorldMatrix(true)
   // console.log('reset matrix success!')
}
function adjustTranslationMatrix(matrix) {
   return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[12],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[13],
      matrix[8],
      matrix[9],
      matrix[10],
      matrix[14],
      matrix[3],
      matrix[7],
      matrix[11],
      matrix[15],
   ]
}

const scene = createScene()
const sceneUp = createUpScene()
const sceneLow = createLowScene()
sceneUp.onPointerDown = function (evt, pickResult) {
   if (facePositions.length < 4) {
      if (pickResult.hit) {
         var sphere = BABYLON.MeshBuilder.CreateSphere(
            'sphere',
            { diameter: 0.06 },
            sceneUp,
         )
         sphere.material = new BABYLON.StandardMaterial(
            'sphereMaterial',
            sceneUp,
         )
         sphere.material.diffuseColor = new BABYLON.Color3(0, 1, 0)
         const position = pickResult.pickedPoint
         sphere.position = position
         facePositions.push(position)
      }
   }
   if (facePositions.length == 4 && teethPositions.length == 4 && !isAlign) {
      // console.log(facePositions, teethPositions)
      align()
      isAlign = true
   }
}

// 自定义筛选函数，只拾取特定的物体
function pickPredicate(mesh) {
   return mesh === upperJawCopy || mesh === lowerJawCopy
}
sceneLow.onPointerDown = function (evt, pickResult) {
   if (teethPositions.length < 4) {
      if (pickResult.hit) {
         var sphere = BABYLON.MeshBuilder.CreateSphere(
            'sphere',
            { diameter: 2 },
            sceneLow,
         )
         sphere.material = new BABYLON.StandardMaterial(
            'sphereMaterial',
            sceneLow,
         )
         sphere.material.diffuseColor = new BABYLON.Color3(1, 0, 0)
         const position = pickResult.pickedPoint
         sphere.position = position
         teethPositions.push(position)
         //draggable point
         var pointerDragBehavior = new BABYLON.PointerDragBehavior({
            dragPlaneNormal: new BABYLON.Vector3(0, 0, 1),
         })

         sphere.addBehavior(pointerDragBehavior)
         // 添加拖动结束回调函数
         pointerDragBehavior.onDragEndObservable.add(function (eventData) {
            // 获取鼠标位置在屏幕坐标系中的位置
            var pointerX = sceneLow.pointerX
            var pointerY = sceneLow.pointerY

            // 将屏幕坐标系的位置转换为三维空间中的射线
            var pickRay = sceneLow.createPickingRay(
               pointerX,
               pointerY,
               BABYLON.Matrix.Identity(),
               cameraLow,
            )

            // 使用射线与物体 A 进行交点检测
            var pickInfo = sceneLow.pickWithRay(pickRay, pickPredicate)

            // 如果存在交点，则将拖动的物体移动到该位置上
            if (pickInfo.hit) {
               pointerDragBehavior.attachedNode.position.copyFrom(
                  pickInfo.pickedPoint,
               )
            }
            if (facePositions.length == 4 && teethPositions.length == 4) {
               // console.log(facePositions, teethPositions)
               align()
            }
         })
      }
   }
   if (facePositions.length == 4 && teethPositions.length == 4 && !isAlign) {
      // console.log(facePositions, teethPositions)
      align()
      isAlign = true
   }
}
function align() {
   const facePosArray = facePositions.flatMap(({ x, y, z }) => [x, y, z])
   const teethPosArray = teethPositions.flatMap(({ x, y, z }) => [x, y, z])
   // console.log(facePosArray)
   const data = {
      moving_object_list: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
      moving_list: facePosArray,
      fixed_list: teethPosArray,
   }
   // console.log(data)
   const options = {
      method: 'POST',
      headers: {
         'Content-Type': 'application/json',
         // 'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify(data),
   }

   fetch(
      'https://ccbc3f02fc544b6f909e576a6988ca60.apig.cn-east-3.huaweicloudapis.com/transform',
      options,
   )
      .then((response) => response.json())
      .then((data) => {
         // console.log(data)
         var matrixArray = [...data]
         var matrix = BABYLON.Matrix.FromArray(
            adjustTranslationMatrix(matrixArray),
         )

         var scale = new BABYLON.Vector3()
         var translation = new BABYLON.Vector3()
         var rotation = new BABYLON.Quaternion()

         matrix.decompose(scale, rotation, translation)
         // console.log(scale, rotation, translation)

         faceObj.rotationQuaternion = rotation.conjugate()
         faceObj.position = translation
         faceObj.scaling = scale

         faceObj.computeWorldMatrix()

         // 同步将变换矩阵发送给多线程
         const array = Array.from(faceObj.getWorldMatrix().m)
         sendMatrix('face', array)

         setTimeout(function () {
            sendDetectTask()
         }, 20)
      })
      .catch((error) => console.error(error))
}
const axes = new BABYLON.Debug.AxesViewer(scene, 50)
// scene.useRightHandedSystem = true

engine.runRenderLoop(function () {
   scene.render()
})
engineUp.runRenderLoop(function () {
   sceneUp.render()
})
engineLow.runRenderLoop(function () {
   sceneLow.render()
})

//
//
// detect distance worker threads
let workers = []
const workersCount = 5
let completedTasks = 0

let upperColors = []
let lowerColors = []

let t0, t1
function showDistance(mesh, vertexColorData) {
   mesh.setVerticesData(BABYLON.VertexBuffer.ColorKind, vertexColorData)
}
function handleResult(result) {
   upperColors = upperColors.concat(result.array[0])
   lowerColors = lowerColors.concat(result.array[1])

   completedTasks++
   // 检查是否所有任务都已完成
   if (completedTasks === workers.length) {
      // console.log(upperColors)
      t1 = performance.now()
      console.log(`函数执行时间为 ${t1 - t0} 毫秒`)
      // 所有任务都已完成，可以整合结果
      showDistance(upperJaw, upperColors)
      showDistance(lowerJaw, lowerColors)
      console.log(upperColors.length)
   }
}
// 多线程
function startWorker(canvas) {
   const offscreen = canvas.transferControlToOffscreen()
   const worker = new Worker('./worker.js', {
      type: 'module',
   })
   workers.push(worker)
   worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])

   // 将画布尺寸传给多线程，主要用来预览，可删除
   function sendSize() {
      worker.postMessage({
         type: 'size',
         width: canvas.clientWidth,
         height: canvas.clientHeight,
      })
   }
   window.addEventListener('resize', sendSize)
   sendSize()

   console.log('create new worker')
}
// 发送变换后的矩阵
function sendMatrix(object, array) {
   for (let worker of workers) {
      worker.postMessage({
         type: 'matrix',
         object,
         array,
      })
   }
}
// 发送模型
function sendModel(object, path) {
   for (let i = 0; i < workersCount; i++) {
      workers[i].postMessage({
         type: 'model',
         id: i,
         object,
         path,
      })
   }
}
// 向多线程发送检测距离任务
let promises = []
function sendDetectTask() {
   console.log('send detect task')
   t0 = performance.now()
   completedTasks = 0
   promises = []
   upperColors = []
   lowerColors = []
   for (let i = 0; i < workersCount; i++) {
      const promise = new Promise((resolve) => {
         workers[i].onmessage = function (e) {
            const result = e.data
            resolve(result)
         }
      })

      promises.push(promise)
      workers[i].postMessage({
         type: 'detect',
         id: i,
         total: workers.length,
      })
   }
   // 等待所有线程完成任务并获取结果
   Promise.all(promises).then((results) => {
      // 所有线程都已完成任务并返回结果
      results.forEach(handleResult)
   })
}
// 管理多线程的主函数
const createWorker = () => {
   //create workers

   for (let i = 0; i < workersCount; i++) {
      const canvas = document.createElement('canvas')
      const div = document.querySelector('.workers')
      div.appendChild(canvas)
      startWorker(canvas)
   }
   //send model path to workers
   sendModel('upperjaw', '/upperJaw.stl')
   sendModel('lowerjaw', '/lowerJaw.stl')
   sendModel('face', '/smile.obj')

   // window.addEventListener('click', () => {
   //    if (!upperJaw) {
   //       workers[0].postMessage({
   //          type: 'plydata',
   //          object: 'upperjaw',
   //       })
   //       workers[0].postMessage({
   //          type: 'plydata',
   //          object: 'lowerjaw',
   //       })
   //    }
   // })
   // const material = new BABYLON.StandardMaterial('material', scene)
   // const materialLow = new BABYLON.StandardMaterial('material', sceneLow)
   // material.backFaceCulling = false
   // workers[0].onmessage = (e) => {
   //    const colors = []
   //    const positions = []
   //    for (var i = 0; i < e.data.color.length; i++) {
   //       colors.push(e.data.color[i])
   //       if ((i + 1) % 3 === 0) {
   //          colors.push(1)
   //       }
   //    }

   //    for (var i = 0; i < e.data.position.length; i += 3) {
   //       positions.push(
   //          e.data.position[i],
   //          e.data.position[i + 2],
   //          e.data.position[i + 1],
   //       )
   //    }
   //    console.log(
   //       positions.length,
   //       e.data.color.length,
   //       colors.length,
   //       e.data.object,
   //    )
   //    const vertexData = new BABYLON.VertexData()
   //    vertexData.positions = positions
   //    vertexData.indices = e.data.index
   //    vertexData.colors = colors
   //    if (e.data.object === 'upperjaw') {
   //       upperJaw = new BABYLON.Mesh('upperjaw', scene)
   //       vertexData.applyToMesh(upperJaw)
   //       upperJaw.material = material

   //       upperJawCopy = new BABYLON.Mesh('upperjawCopy', sceneLow)
   //       vertexData.applyToMesh(upperJawCopy)
   //       upperJawCopy.material = materialLow
   //    } else {
   //       lowerJaw = new BABYLON.Mesh('lowerjaw', scene)
   //       vertexData.applyToMesh(lowerJaw)
   //       lowerJaw.material = material

   //       lowerJawCopy = new BABYLON.Mesh('lowerjawCopy', sceneLow)
   //       vertexData.applyToMesh(lowerJawCopy)
   //       lowerJawCopy.material = materialLow
   //    }
   // }
}
createWorker()
