import PostureTracker from './PostureTracker';
import { useRef } from 'react';

export default function PostureUp() {
  // Create a reference to PostureTracker
  const postureTracker = useRef(new PostureTracker()).current;
  
  // Rest of your existing code...
}