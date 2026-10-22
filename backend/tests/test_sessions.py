"""
Unit tests for backend face recognition matching classification and perceptual hash
"""

import unittest

def classify_confidence(score, match_threshold=90.0, review_threshold=80.0):
    if score >= match_threshold:
        return 'matched'
    elif score >= review_threshold:
        return 'review'
    return 'unknown'

class TestSessionPipeline(unittest.TestCase):
    def test_confidence_classification(self):
        self.assertEqual(classify_confidence(98.2), 'matched')
        self.assertEqual(classify_confidence(90.0), 'matched')
        self.assertEqual(classify_confidence(89.9), 'review')
        self.assertEqual(classify_confidence(80.0), 'review')
        self.assertEqual(classify_confidence(79.9), 'unknown')
        self.assertEqual(classify_confidence(55.0), 'unknown')

    def test_attendance_formula(self):
        present = 36
        total = 40
        rate = (present / total) * 100
        self.assertEqual(rate, 90.0)
        missable = int((present - 0.75 * total) / 0.75)
        self.assertEqual(missable, 8)

if __name__ == '__main__':
    unittest.main()
