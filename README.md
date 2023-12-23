# babylonjs与threejs协作方案
# 简介
主场景中进行口扫与面扫的距离检测，需要遍历口扫物体所有顶点，向法线位置发射射线，检测与面扫物体相交位置的距离，然后根据规则对口扫物体的顶点颜色进行设置。
![Image](https://docimg6.docs.qq.com/image/AgAACMMYRMbfPSxcntlLjqgwvNkSvHmd.png?w=755&h=500)
主场景：babylonjs。用于显示场景，同时与用户进行直接交互
副场景：threejs。用于给主场景提供计算支持，在threejs中需搭建与主场景相同的场景，当需要检测距离时，在threejs场景中执行检测距离函数，并返回顶点颜色数组给主场景，在主场景中显示顶点颜色的结果。
# 一、难点及解决方案
## 1. 坐标系统不同
两引擎的坐标系不同，babylon采用左手坐标系，threejs采用右手坐标系，如果使两个场景的物体显示同步的位置、旋转、缩放，就需要进行坐标矩阵转换。两坐标系的区别表现在y轴与z轴的数据是相反的。
## 解决方案
在threejs 中对babylonjs的坐标进行转换。一是y与z轴坐标相互交换，二是需要对原矩阵的旋转方向进行求反。此部分在多线程中完成，主线程无需考虑。
```javascript
function convertBto3Matrix(array) {
    // 创建 Matrix4 对象
    const matrix = new THREE.Matrix4()
    matrix.fromArray(convertYtoZMatrix(array))
    const translation = new THREE.Vector3()
    const rotation = new THREE.Quaternion()
    const scale = new THREE.Vector3()
    matrix.decompose(translation, rotation, scale)

    const newMatrix = new THREE.Matrix4().compose(translation, rotation, scale)
    return newMatrix
}

function convertYtoZMatrix(array) {
    return [
        array[0],array[2],array[1],array[3],
        array[8],array[10],array[9],array[11],
        array[4],array[6],array[5],array[7],
        array[12],array[14],array[13],array[15],
    ]
}
```

## 2. 模型解析的结果可能不同
当导入stl文件或ply文件后，两引擎解析后的结果可能会不同，那么threejs进行距离检测计算之后返回的颜色数组，可能无法和babylon中的模型一一对应，就会导致颜色显示错误。但目前两引擎对stl模型的解析结果相同。ply模型暂未测试。如果不一致可采用如下解决方案。
## 解决方案
在babylon中，对上下颌牙齿模型解析后的重复顶点进行合并，建立顶点索引，然后将得到的顶点位置、索引值发送给threejs，threejs根据这些数据进行模型重建，即可保证两场景内容完全一致。

以上两个难点也是项目中可能会出现bug的地方。
# 二、API列表
调用方法：
```javascript
worker.postMessage({
   type: 'functionName',
   item01: value,
   item02: value,
})

如：
worker.postMessage({
   type: 'model',
   object: 'face',
   path: './smile.obj',
})
```
|类型|type|item|value|
|-|-|-|-|
|初始化场景|init|canvas|离屏画布|
|加载模型|model|object|指定是哪一个模型
面扫模型：‘face’, 
上颌牙齿：‘upperjaw’, 
下颌牙齿：’lowerjaw’|
| | |path|相对路径|
|发送坐标矩阵|matrix|object|指定是哪一个模型
面扫模型：‘face’, 
上颌牙齿：‘upperjaw’, 
下颌牙齿：’lowerjaw’|
| | |array|16个数组成的一维数组（对物体使用getWorldMatrix().m获得）|
|应用坐标矩阵|apply|object|指定是哪一个模型
面扫模型：‘face’, 
上颌牙齿：‘upperjaw’, 
下颌牙齿：’lowerjaw’|
|发送距离检测任务|detect|id|线程id|
| | |total|线程总数|
| |colors|id|返回线程id|
| | |array|返回的颜色数组|


# 三、帮助文档
## 0. 模型预处理
### 顶点合并
在babylon中，当加载口扫的模型数据后，创建口扫副本（示例文档中名称分别为upperJaw、lowerJaw），并进行顶点合并。
```javascript
// 合并重复顶点
upperJaw.forceSharedVertices()

// 合并重复顶点
lowerJaw.forceSharedVertices()
```

### 对面扫模型进行镜像处理
babylonjs对面扫模型的解析结果是镜像的，因此需要做镜像处理（z轴缩放-1），并将结果应用到模型的顶点上，从而重置模型的世界坐标矩阵。
在threejs，需要将模型沿x轴旋转90度，并应用结果。（已在多线程js文件中完成）
此步骤将两场景中的模型位置保持一致。
```javascript
var scale = new BABYLON.Vector3(1, 1, -1)
faceObj.scaling = scale
resetMatrix(faceObj)

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
    console.log('reset matrix success!')
}
```
### 安装threejs等库
```javascript
npm i three
npm i three-mesh-bvh
```

## 1. 创建threejs多线程场景
当页面加载后，同步创建threejs场景，并完成初始化
```javascript
let workers = []
const workersCount = 5
// 创建多线程
function startWorker(canvas) {
    const offscreen = canvas.transferControlToOffscreen()
    const worker = new Worker('./worker.js', {
        type: 'module',
    })
    workers.push(worker)
    // 初始化threejs场景
    worker.postMessage({ type: 'init', canvas: offscreen }, [offscreen])
    console.log('create new worker')
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
}
createWorker()
```

## 2. 发送模型数据
当面扫模型生成并下载完成或当用户选择了上下颌牙齿模型后，调用model口令，将模型发送给threejs场景。因为有多个线程，因此需要向所有线程发送模型数据。
```javascript
// 发送模型
function sendModel(object, path) {
    for (let worker of workers) {
        worker.postMessage({
            type: 'model',
            object,
            path,
        })
    }
}

//send model path to workers
sendModel('upperjaw', '/upperJaw.stl')
sendModel('lowerjaw', '/lowerJaw.stl')
sendModel('face', '/smile.obj')
```

## 3. 发送坐标数据
当用户移动模型，则需要将模型坐标数据同步发送给threejs场景，或在进入配准界面时，发送模型坐标数据。比如当用户移动了面扫模型后（faceObj为面扫模型变量）：
```javascript
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

// 同步将变换矩阵发送给多线程
const array = Array.from(faceObj.getWorldMatrix().m)
sendMatrix('face', array)
```

## 4. 发送距离检测任务，并回收颜色数据
这一步骤向所有线程发送检测任务，并监听发回来的数据，因为线程发送的顺序可能是乱序的，因此需要建立Promise。
```javascript
// 向多线程发送检测距离任务
let promises = []
let completedTasks = 0
let upperColors = []
let lowerColors = []
let t0, t1     //用来测试运算时间

function sendDetectTask() {
    console.log('send detect task')
    t0 = performance.now()
    // reset variable state
    promises = []
    completedTasks = 0
    upperColors = []
    lowerColors = []
    for (let i = 0; i < workers.length; i++) {
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
```

## 5. 显示颜色数据
```javascript
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
    }
}
```
