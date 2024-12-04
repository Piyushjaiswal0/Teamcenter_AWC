#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

bool serach(int arr[], int element, int size){
    int leftIndex = 0;
    int rightIndex = (size - 1);

    while (leftIndex <= rightIndex)
    {
        int pivot = (leftIndex + rightIndex) / 2;
        if (element == arr[pivot])
        {
            cout << "Element found at index" << pivot;
            return true;
        }
        else if (element < arr[pivot])
        {
            rightIndex = pivot - 1;
        }
        else if (element > arr[pivot])
        {
            leftIndex = pivot + 1;
        }
    }
    return false;
}

bool serach2D(int arr[100][100], int element, int rows, int col){
    int leftIndex = 0;
    int RightIndex = (rows*col)-1;

    while (leftIndex <= RightIndex)
    {
        int pivot = (leftIndex + RightIndex) / 2;
        if (element == arr[pivot/rows][pivot%col])
        {
            cout << "\nElement found at index (row,col):(" << pivot/rows << ", " << pivot%col << ")";
            return true;
        }
        else if (element < arr[pivot/rows][pivot%col])
        {
            RightIndex = pivot - 1;
        }
        else if (element > arr[pivot/rows][pivot%col])
        {
            leftIndex = pivot + 1;
        }
    }
    return false;
}

int main()
{
    // int size = 0;
    // cout << "------------------- 1D Array ---------------------------\nEnter total value in array :";
    // cin >> size;
    // int* arr = new int[size];
    // for (int i = 0; i < size; i++)
    // {
    //     cout << "Enter the value of at index " << i << " :";
    //     cin >> arr[i];
    // }

    // sort(arr, arr + size);
    // cout<<"\narray: ";
    // for (int i = 0; i < size; i++) {
    //     cout << arr[i] << ", ";
    // }

    // int element = 0;
    // cout << "\nEnter the element to find: ";
    // cin >> element;

    // if(!serach(arr, element, size)){
    //     cout << "Element not found "<< endl;
    // }

    int size = 0;
    cout << "---------------- 2D Array ----------------------\nEnter total entries in array 1: ";
    cin >> size;

    int size2 = 0;
    cout << "Enter total entries in array 2: ";
    cin >> size2;

    int arr2D[100][100];
    for(int i = 0; i< size; i++){
        cout << "Enter values for element " << i << endl;
        for (int j = 0; j< size2; j++){
            cout << "Enter the value of at index " << j << " :";
            cin >> arr2D[i][j];
        }
    }

    int element = 0;
    cout << "\nEnter the element to find: ";
    cin >> element;

    cout<<"\n2Darray:-" << endl;
    for(int i = 0; i< size; i++){
        for (int j = 0; j< size2; j++){
            cout << arr2D[i][j] << " ";
        }
        cout << endl;
    }
    serach2D(arr2D, element, size, size2 );
    return 0;
}