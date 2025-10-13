'use client';

import { Suspense } from 'react';
import {FeedbackInner} from './FeedbackInner'; 

export default function FeedbackPage() {
  return (
    <Suspense fallback={<div />}>
      <FeedbackInner />
    </Suspense>
  );
}
