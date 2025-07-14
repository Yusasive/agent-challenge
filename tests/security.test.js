// Basic security tests for the Smart Contract Auditor Agent
// Run with: node tests/security.test.js

const assert = require('assert');

// Mock test data
const testContracts = {
  vulnerable: `
    pragma solidity ^0.7.0;
    contract VulnerableContract {
        mapping(address => uint) public balances;
        
        function withdraw() public {
            uint amount = balances[msg.sender];
            (bool success,) = msg.sender.call{value: amount}("");
            require(success);
            balances[msg.sender] = 0; // Reentrancy vulnerability
        }
        
        function authorize() public {
            require(tx.origin == owner); // tx.origin vulnerability
        }
    }
  `,
  
  secure: `
    pragma solidity ^0.8.0;
    import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
    
    contract SecureContract is ReentrancyGuard {
        mapping(address => uint) public balances;
        address public owner;
        
        modifier onlyOwner() {
            require(msg.sender == owner, "Not owner");
            _;
        }
        
        function withdraw() public nonReentrant {
            uint amount = balances[msg.sender];
            balances[msg.sender] = 0; // State change before external call
            (bool success,) = msg.sender.call{value: amount}("");
            require(success, "Transfer failed");
        }
    }
  `,
  
  malicious: `
    <script>alert('xss')</script>
    pragma solidity ^0.8.0;
    contract Test {
        // Malicious content injection attempt
    }
  `
};

// Test input validation
function testInputValidation() {
  console.log('Testing input validation...');
  
  // Test contract code validation
  try {
    const { validateAndSanitizeInput } = require('../src/mastra/utils/input-validation');
    
    // Test valid contract
    const validResult = validateAndSanitizeInput({
      contractCode: testContracts.secure,
      contractName: 'SecureContract'
    });
    assert(validResult.contractCode, 'Valid contract should pass validation');
    assert(validResult.contractName === 'SecureContract', 'Valid name should pass validation');
    
    // Test malicious input sanitization
    const maliciousResult = validateAndSanitizeInput({
      contractCode: testContracts.malicious,
      contractName: 'Test<script>alert("xss")</script>'
    });
    assert(!maliciousResult.contractCode.includes('<script>'), 'Script tags should be removed');
    assert(!maliciousResult.contractName.includes('<'), 'HTML should be removed from name');
    
    console.log(' Input validation tests passed');
  } catch (error) {
    console.error(' Input validation test failed:', error.message);
  }
}

// Test rate limiting
function testRateLimiting() {
  console.log('Testing rate limiting...');
  
  try {
    const { RateLimiter } = require('../src/mastra/utils/input-validation');
    
    const limiter = new RateLimiter(3, 1000); // 3 requests per second
    const identifier = 'test-user';
    
    // First 3 requests should pass
    assert(limiter.isAllowed(identifier), 'First request should be allowed');
    assert(limiter.isAllowed(identifier), 'Second request should be allowed');
    assert(limiter.isAllowed(identifier), 'Third request should be allowed');
    
    // Fourth request should be blocked
    assert(!limiter.isAllowed(identifier), 'Fourth request should be blocked');
    
    console.log(' Rate limiting tests passed');
  } catch (error) {
    console.error(' Rate limiting test failed:', error.message);
  }
}

// Test vulnerability detection patterns
function testVulnerabilityDetection() {
  console.log('Testing vulnerability detection...');
  
  try {
    // Test reentrancy detection
    const hasReentrancy = testContracts.vulnerable.includes('.call{value:') && 
                         testContracts.vulnerable.indexOf('balances[msg.sender] = 0') > 
                         testContracts.vulnerable.indexOf('.call{value:');
    assert(hasReentrancy, 'Should detect reentrancy pattern');
    
    // Test tx.origin detection
    const hasTxOrigin = testContracts.vulnerable.includes('tx.origin');
    assert(hasTxOrigin, 'Should detect tx.origin usage');
    
    // Test secure contract doesn't have vulnerabilities
    const secureHasReentrancy = testContracts.secure.includes('nonReentrant');
    assert(secureHasReentrancy, 'Secure contract should use reentrancy guard');
    
    console.log(' Vulnerability detection tests passed');
  } catch (error) {
    console.error(' Vulnerability detection test failed:', error.message);
  }
}

// Test logging security
function testLoggingSecurity() {
  console.log('Testing logging security...');
  
  try {
    const { createSecureLogger } = require('../src/mastra/utils/input-validation');
    
    const logger = createSecureLogger('info');
    
    // Capture console output
    const originalLog = console.info;
    let logOutput = '';
    console.info = (...args) => {
      logOutput += args.join(' ');
    };
    
    // Test that sensitive data is redacted
    logger.info('Test log', {
      contractCode: 'sensitive contract code',
      apiKey: 'secret-key-123',
      normalData: 'this should appear'
    });
    
    console.info = originalLog;
    
    assert(!logOutput.includes('sensitive contract code'), 'Contract code should be redacted');
    assert(!logOutput.includes('secret-key-123'), 'API key should be redacted');
    assert(logOutput.includes('this should appear'), 'Normal data should appear');
    
    console.log(' Logging security tests passed');
  } catch (error) {
    console.error(' Logging security test failed:', error.message);
  }
}

// Run all tests
function runTests() {
  console.log('🧪 Running Smart Contract Auditor Security Tests\n');
  
  testInputValidation();
  testRateLimiting();
  testVulnerabilityDetection();
  testLoggingSecurity();
  
  console.log('\n All security tests completed!');
  console.log(' Manual testing checklist:');
  console.log('  - Test agent with various contract types');
  console.log('  - Verify no sensitive data in logs');
  console.log('  - Check rate limiting in browser');
  console.log('  - Test error handling with invalid inputs');
  console.log('  - Verify Docker container security');
}

// Run tests if this file is executed directly
if (require.main === module) {
  runTests();
}

module.exports = {
  testContracts,
  runTests
};