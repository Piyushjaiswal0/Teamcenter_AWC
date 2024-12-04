// Question : Given an unsorted array arr containing only non-negative integers, your task is to find a continuous subarray (a contiguous sequence of elements) whose sum equals a specified value target. You need to return the 1-based indices of the leftmost and rightmost elements of this subarray.

// Example:
// Input: arr[] = [1,2,3,7,5], target = 12
// Output: [2, 4]
// Explanation: The sum of elements from 2nd to 4th position is 12.

// Input: arr[] = [1,2,3,4,5,6,7,8,9,10], target = 15,
// Output: [1, 5]
// Explanation: The sum of elements from 1st to 5th position is 15.

// Input: arr[] = [5,3,4], target = 2
// Output: [-1]
// Explanation: There is no subarray with sum 2.

#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main()
{
    int sizeOfArray = 0;
    cout << "Enter total number of values should be insert into array :";
    cin >> sizeOfArray;

    vector<int> arr;
    cout << "Enter array elements" << endl;
    for (int i = 0; i < sizeOfArray; i++)
    {
        cout << "value at index " << i + 1 << " is : ";
        int value = 0;
        cin >> value;
        arr.push_back(value);
    }

    int target = 0;
    cout << "Enter value of target :";
    cin >> target;
    
    cout << "Array : ";
    for(const auto& myvec : arr){
        cout << myvec << ", ";
    }

    // Sliding window approach
    int start = 0, currentSum = 0;
    for (int index = 0; index < sizeOfArray; index++) {
        currentSum += arr[index]; 
        
        // If current sum exceeds target, shrink the window from the left
        while (currentSum > target && start <= index) {
            currentSum -= arr[start];
            start++;
        }
        
        if (currentSum == target) {
            cout << "\n[" << start + 1 << ", " << index + 1 << "] :: the sum of values from index " 
                 << start + 1 << " to " << index + 1 << " is equal to target" << endl;
            return 0;
        }
    }

    cout << "\n[-1] :: No subarray found with the given target" << endl;
    return 0;
}