const test = require('node:test');
const assert = require('node:assert/strict');

test('Group F: Honesty of Claims & 80G Legal Certificate Integrity', async (t) => {
  const { generate80GCertificate } = await import('../client/src/utils/certificate.js');

  await t.test('F1: Deterministic certificate ID generated from donation ID and current year', () => {
    const mockDonor = {
      name: 'The Grand Heritage Banquet',
      phone: '9876543210',
      organization: 'The Grand Heritage Banquet',
      role: 'DONOR'
    };
    const mockHistory = [
      {
        id: '67a89f01bc23de45',
        title: 'Dal and Rice Platters',
        quantity: '50 meals',
        claimed_by_ngo: 'Robin Hood Army',
        darpan_id: 'DL/2018/0192831',
        pan_number: 'AAATR8821F',
        ngo_80g_order: 'ITBA/EXM/S/80G/2023-24/1058291823(1)'
      }
    ];

    const result = generate80GCertificate(mockDonor, mockHistory);
    assert.ok(result, 'Result must be returned');
    assert.equal(result.hasValid80G, true);
    assert.equal(result.doneeName, 'Robin Hood Army');

    const expectedSuffix = 'BC23DE45';
    const currentYear = new Date().getFullYear();
    assert.equal(result.certNumber, `FL-80G-${expectedSuffix}-${currentYear}`);
  });

  await t.test('F1: Unverified or unapproved NGO triggers DEMO / SAMPLE non-tax-deductible watermark', () => {
    const mockDonor = {
      name: 'City Fast Food Kitchen',
      phone: '9988776655',
      organization: 'City Fast Food'
    };
    const mockHistory = [
      {
        id: '99aabbccddeeff00',
        title: 'Surplus Rolls and Wraps',
        quantity: '30 meals',
        claimed_by_ngo: 'Local Community Kitchen',
        darpan_id: 'DL/2024/0009999',
        pan_number: '', // No PAN on file
        ngo_80g_order: '' // No 80G Order on file
      }
    ];

    const result = generate80GCertificate(mockDonor, mockHistory);
    assert.equal(result.hasValid80G, false, 'hasValid80G must be false when NGO lacks 80G approval order');
    assert.equal(result.doneeName, 'Local Community Kitchen');
    assert.ok(result.doc);

    // Verify PDF binary output can be generated
    const pdfOutput = result.doc.output();
    assert.ok(pdfOutput && pdfOutput.length > 500, 'PDF binary string must be generated');
    // Ensure watermark string exists in PDF stream
    assert.match(pdfOutput, /DEMO \/ SAMPLE/);
  });
});
