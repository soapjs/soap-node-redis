import { spawn } from 'child_process';
import { GenericContainer, StartedTestContainer, Wait } from 'testcontainers';
import * as path from 'path';
import { readdirSync } from 'fs';

// Handle process termination gracefully
let isShuttingDown = false;

process.on('SIGINT', async () => {
  if (isShuttingDown) {
    console.log('🛑 Force exiting...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('🛑 Received SIGINT, cleaning up...');
  await teardownRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (isShuttingDown) {
    console.log('🛑 Force exiting...');
    process.exit(1);
  }
  
  isShuttingDown = true;
  console.log('🛑 Received SIGTERM, cleaning up...');
  await teardownRedis();
  process.exit(0);
});

let redisContainer: StartedTestContainer;
let redisUrl: string;

async function setupRedis(): Promise<string> {
  console.log('🚀 Starting Redis container for integration tests...');
  
  // Start Redis container
  redisContainer = await new GenericContainer('redis:7-alpine')
    .withExposedPorts(6379)
    .withEnvironment({
      REDIS_PASSWORD: 'testpassword'
    })
    .withWaitStrategy(Wait.forListeningPorts())
    .start();

  const mappedPort = redisContainer.getMappedPort(6379);
  redisUrl = `redis://:testpassword@127.0.0.1:${mappedPort}`;
  
  // Wait a bit for Redis to be fully ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  console.log(`✅ Redis container started on port ${mappedPort}`);
  console.log(`🔗 Redis URL: ${redisUrl}`);
  
  return redisUrl;
}

async function teardownRedis(): Promise<void> {
  if (redisContainer) {
    console.log('🛑 Stopping Redis container...');
    await redisContainer.stop();
    console.log('✅ Redis container stopped');
  }
}

async function runTestFile(testFile: string): Promise<boolean> {
  return new Promise((resolve) => {
    console.log(`\n🧪 Running test: ${testFile}`);
    
    const testProcess = spawn('npx', [
      'jest',
      '--config=jest.config.integration.json',
      '--testPathPattern=' + testFile,
      '--verbose',
      '--forceExit'
    ], {
      stdio: 'inherit',
      env: {
        ...process.env,
        REDIS_URL: redisUrl
      }
    });

    testProcess.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Test passed: ${testFile}`);
        resolve(true);
      } else {
        console.log(`❌ Test failed: ${testFile} (exit code: ${code})`);
        resolve(false);
      }
    });

    testProcess.on('error', (error) => {
      console.error(`❌ Error running test ${testFile}:`, error);
      resolve(false);
    });
  });
}

async function runAllIntegrationTests(): Promise<void> {
  const testFiles = readdirSync(path.join(__dirname, '..', 'integration')).filter(file => file.endsWith('.test.ts'));

  try {
    // Setup Redis container
    await setupRedis();
    
    // Wait a bit for container to be fully ready
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n📋 Running integration tests...');
    
    const results: { file: string; passed: boolean }[] = [];
    
    for (const testFile of testFiles) {
      const passed = await runTestFile(testFile);
      results.push({ file: testFile, passed });
    }
    
    // Summary
    console.log('\n📊 Test Results Summary:');
    console.log('========================');
    
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    
    results.forEach(result => {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.file}`);
    });
    
    console.log(`\n📈 Total: ${results.length} tests`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    if (failed > 0) {
      console.log('\n❌ Some tests failed!');
      process.exit(1);
    } else {
      console.log('\n🎉 All tests passed!');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Error during test execution:', error);
    process.exit(1);
  } finally {
    await teardownRedis();
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, cleaning up...');
  await teardownRedis();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, cleaning up...');
  await teardownRedis();
  process.exit(0);
});

// Run the tests
runAllIntegrationTests();
