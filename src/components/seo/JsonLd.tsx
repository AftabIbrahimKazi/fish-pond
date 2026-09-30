/**
 * Json Ld.
 * Renders one schema.org JSON-LD block. The markup is built from our own constants, and "<" is
 * escaped so the data can never close the script tag.
 */

import React from 'react';

interface JsonLdProps {
  data: Record<string, unknown>;
}

export const JsonLd: React.FC<JsonLdProps> = ({ data }) => (
  <script
    type="application/ld+json"
    dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
  />
);
