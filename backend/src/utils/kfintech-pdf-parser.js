/**
 * Kfintech PDF Statement Parser
 * Parses text extracted from Kfintech mutual fund PDF statements
 * into structured transaction data.
 */

/**
 * Parse a Kfintech consolidated account statement from extracted text.
 * @param {string} text - The raw text extracted from the PDF
 * @returns {object} - Parsed statement data with funds and transactions
 */
function parseKfintechStatement(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  const result = {
    investorName: '',
    panNumber: '',
    funds: [],
    transactions: [],
    rawLineCount: lines.length
  };

  // Extract investor name (usually near the top)
  const nameMatch = text.match(/(?:Dear|Name[:\s]*|Investor[:\s]*)([A-Z][A-Za-z\s]+)/);
  if (nameMatch) {
    result.investorName = nameMatch[1].trim();
  }

  // Extract PAN
  const panMatch = text.match(/PAN[:\s]*([A-Z]{5}\d{4}[A-Z])/);
  if (panMatch) {
    result.panNumber = panMatch[1];
  }

  let currentFund = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Detect fund/scheme name lines
    // Kfintech statements typically have scheme names in specific patterns
    const schemeMatch = line.match(
      /^(.*(?:Fund|Scheme|Growth|Dividend|Direct|Regular|Plan|ELSS|Equity|Debt|Liquid|Balanced|Hybrid|Index|ETF).*)$/i
    );
    if (schemeMatch && line.length > 10 && !line.match(/^\d/)) {
      currentFund = schemeMatch[1].trim();
      if (!result.funds.includes(currentFund)) {
        result.funds.push(currentFund);
      }
    }

    // Parse transaction rows
    // Typical format: DD-Mon-YYYY or DD/MM/YYYY followed by description, amount, units, price, balance
    const trxnMatch = line.match(
      /(\d{1,2}[-\/]\w{3,9}[-\/]\d{2,4})\s+(.*?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{3,4})\s+([\d,]+\.\d{2,4})\s+([\d,]+\.\d{3,4})/
    );

    if (trxnMatch && currentFund) {
      const [, dateStr, description, amount, units, nav, balance] = trxnMatch;

      // Determine transaction type from description
      let trxnType = 'OTHER';
      const descUpper = description.toUpperCase();
      if (descUpper.includes('PURCHASE') || descUpper.includes('SIP') || descUpper.includes('ADDITIONAL')) {
        trxnType = 'BUY';
      } else if (descUpper.includes('REDEMPTION') || descUpper.includes('WITHDRAW')) {
        trxnType = 'SELL';
      } else if (descUpper.includes('SWITCH IN')) {
        trxnType = 'BUY';
      } else if (descUpper.includes('SWITCH OUT')) {
        trxnType = 'SELL';
      } else if (descUpper.includes('DIVIDEND')) {
        trxnType = 'DIVIDEND';
      }

      result.transactions.push({
        fundName: currentFund,
        trxnDate: dateStr,
        description: description.trim(),
        trxnType,
        amountINR: parseFloat(amount.replace(/,/g, '')),
        trxnUnits: parseFloat(units.replace(/,/g, '')) * (trxnType === 'SELL' ? -1 : 1),
        navPerUnit: parseFloat(nav.replace(/,/g, '')),
        balanceUnits: parseFloat(balance.replace(/,/g, ''))
      });
    }

    // Also try a simpler date-amount-units pattern for less structured statements
    if (!trxnMatch && currentFund) {
      const simpleMatch = line.match(
        /(\d{1,2}[-\/]\w{3,9}[-\/]\d{2,4})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{3,4})/
      );

      if (simpleMatch) {
        const [, dateStr, description, amount, units] = simpleMatch;

        let trxnType = 'OTHER';
        const descUpper = description.toUpperCase();
        if (descUpper.includes('PURCHASE') || descUpper.includes('SIP')) {
          trxnType = 'BUY';
        } else if (descUpper.includes('REDEMPTION') || descUpper.includes('WITHDRAW')) {
          trxnType = 'SELL';
        }

        result.transactions.push({
          fundName: currentFund,
          trxnDate: dateStr,
          description: description.trim(),
          trxnType,
          amountINR: parseFloat(amount.replace(/,/g, '')),
          trxnUnits: parseFloat(units.replace(/,/g, '')) * (trxnType === 'SELL' ? -1 : 1),
          navPerUnit: null,
          balanceUnits: null
        });
      }
    }
  }

  return result;
}

module.exports = { parseKfintechStatement };
