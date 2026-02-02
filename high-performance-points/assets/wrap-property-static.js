const fs = require('fs');

// 读取原始数组数据
const rawData = JSON.parse(fs.readFileSync('src/assets/property-static.json', 'utf8'));

console.log('Original data points:', rawData.length);

// 计算min/max (不能用spread operator，数据量太大)
let min = Infinity;
let max = -Infinity;
for (let i = 0; i < rawData.length; i++) {
  if (rawData[i] < min) min = rawData[i];
  if (rawData[i] > max) max = rawData[i];
}

console.log('Min:', min);
console.log('Max:', max);

// 使用正确的维度 (来自metadata.pointNumber)
const total = rawData.length;
const width = 145;
const height = 139;
const depth = 408;
console.log('Expected dimensions:', width, 'x', height, 'x', depth, '=', width * height * depth);
console.log('Actual data points:', total);
console.log('Match:', total === width * height * depth ? '✓' : '✗');

// 包装成与Temperature.json相同的格式
const wrappedData = {
  name: "Static Property",
  description: "Static property data (original property-static.json)",
  unit: "normalized",
  data: rawData,
  metadata: {
    min: min,
    max: max,
    dimensions: {
      width: width,
      height: height,
      depth: depth
    },
    generatedAt: new Date().toISOString(),
    note: "Wrapped from original array format"
  }
};

// 先保存到临时文件，不直接覆盖
fs.writeFileSync('src/assets/property-static-wrapped.json', JSON.stringify(wrappedData, null, 2));

const fileSize = fs.statSync('src/assets/property-static-wrapped.json').size;
console.log('\n✓ Created property-static-wrapped.json');
console.log('File size:', (fileSize / 1024 / 1024).toFixed(2), 'MB');
console.log('\n⚠️  Please review the dimensions before replacing the original file!');
