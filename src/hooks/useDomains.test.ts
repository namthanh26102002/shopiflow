import { describe, it, expect } from 'vitest';
import { isApexDomain, dnsRecordsFor, normalizeDomain, formatPath } from './useDomains';

describe('isApexDomain', () => {
  it('treats a bare domain as apex', () => {
    expect(isApexDomain('ghostconvert.com')).toBe(true);
  });

  it('treats a subdomain as not apex', () => {
    expect(isApexDomain('try.ghostconvert.com')).toBe(false);
  });

  // example.co.uk has three labels but is still the root of the domain.
  it('handles compound suffixes', () => {
    expect(isApexDomain('example.co.uk')).toBe(true);
    expect(isApexDomain('shop.example.co.uk')).toBe(false);
  });
});

describe('dnsRecordsFor', () => {
  it('gives an apex A records at the proxy', () => {
    const records = dnsRecordsFor('ghostconvert.com', '216.198.79.1');
    expect(records).toEqual([
      { type: 'A', name: '@', value: '216.198.79.1' },
      { type: 'A', name: 'www', value: '216.198.79.1' },
    ]);
  });

  // The bug this guards: a subdomain given A records pointing at PROXY_IP
  // never verifies, because the host serves subdomains from rotating IPs.
  it('gives a subdomain a CNAME, not an A record', () => {
    const records = dnsRecordsFor('try.ghostconvert.com', '216.198.79.1');
    expect(records).toEqual([
      { type: 'CNAME', name: 'try', value: 'cname.vercel-dns.com' },
    ]);
  });

  it('does not print "null" when the proxy IP is unknown', () => {
    expect(dnsRecordsFor('ghostconvert.com', null)[0].value).toBe('');
  });
});

describe('normalizeDomain', () => {
  it('strips scheme, www and trailing slashes', () => {
    expect(normalizeDomain('  https://www.Ghostconvert.com/ ')).toBe('ghostconvert.com');
  });

  it('leaves a subdomain that is not www intact', () => {
    expect(normalizeDomain('https://try.ghostconvert.com')).toBe('try.ghostconvert.com');
  });
});

describe('formatPath', () => {
  it('lowercases and drops illegal characters', () => {
    expect(formatPath('My Quiz!')).toBe('myquiz');
  });

  it('strips leading hyphens', () => {
    expect(formatPath('--offer')).toBe('offer');
  });
});
